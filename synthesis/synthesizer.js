import fs from 'fs'
import shell from 'shelljs';
import { v7 as uuidv7 } from 'uuid';

import { fetchModuleTreeFromServer } from './linked-utilities/shdlFetch.js';
import { checkModule } from './linked-utilities/shdlAnalyser.js';
import { parametersArity, parametersNameAtIndex, getEquipotentialNames } from './linked-utilities/shdlUtilities.js';
import { strToBin } from './linked-utilities/binutils.js';


// options: commander options (verbose, etc.)
export async function synthesize(app, moduleName, userId, board, server, vivadoPath, jwt, options) {
   console.log(`Synthesis of module '${moduleName}' for board '${board.name}'`)
   let moduleFile = `${moduleName}-${uuidv7()}`

   // fetch root module tree from server
   let name2module = await fetchModuleTreeFromServer(app, moduleName, userId, server, jwt, options)
   let module = name2module[moduleName]

   // perform a full semantic check
   let { err, moduleList } = checkModule(module.name, name2module)
   if (err) throw err

   // look for all clocks
   let clocks = []
   module.equipotentials.forEach(function(equipotential) {
      if (equipotential.type === 'sequential' || equipotential.type === 'ram_aread_swrite') {
         if (clocks.indexOf(equipotential.clk) === -1) {
            clocks.push(equipotential.clk)
         }
      }
   })

   let parameterList = module.structure.params
   let parameterCount = parametersArity(parameterList)

   // verify that all input/output are board signals and build .xdc file content
   let xdc = ''
   for (let i = 0; i < parameterCount; i++) {
      let parameterName = parametersNameAtIndex(parameterList, i)
      let signal = board.signals.find(signal => signal.shdlName == parameterName)
      if (signal) {
         // if (signal.isOutput && equipotential.isInput) {
         //    throw { message: `*** error: root module '${moduleName}' has an input signal '${signal.shdlName}' which is an output for board '${board.name}'` }
         // } else if (signal.isInput && equipotential.isOutput) {
         //    throw { message: `*** error: root module '${moduleName}' has an output signal '${signal.shdlName}' which is an input for board '${board.name}'` }
         // }
         let parameterFlatName = parameterName.replace('[', '_').replace(']', '')
         let bufferSignalName = `buf_${parameterFlatName}`
         xdc += `# ${signal.shdlName}
set_property PACKAGE_PIN ${signal.pin} [get_ports {${bufferSignalName}}]
set_property IOSTANDARD LVCMOS33 [get_ports {${bufferSignalName}}]
`
         let equipotentialIndex = module.equipotentials['__' + parameterName]
         if (clocks.indexOf(equipotentialIndex) !== -1) {
            // add clock declaration
            xdc += `set_property CLOCK_DEDICATED_ROUTE FALSE [get_nets ${bufferSignalName}]
`
         }
      } else {
         throw { message: `*** error: root module '${moduleName}' has an interface signal '${parameterName}' unknown to board '${board.name}'` }
      }
   }

   // if (options.verbose) console.log(xdc)
   if (options.verbose) console.log(`Created /tmp/${moduleFile}.xdc`)
   fs.promises.writeFile(`/tmp/${moduleFile}.xdc`, xdc)

   // interface section
   let portValues = ''
   for (let i = 0; i < parameterCount; i++) {
      let parameterName = parametersNameAtIndex(parameterList, i)
      let signal = board.signals.find(signal => signal.shdlName == parameterName)
      let equipotentialIndex = module.equipotentials['__' + parameterName]
      let equipotential = module.equipotentials[equipotentialIndex]
      let direction = signalDirection(signal, equipotential)
      let parameterFlatName = parameterName.replace('[', '_').replace(']', '')
      let semicolon = (i === parameterCount - 1) ? '' : ';'
      if (portValues.length > 0) portValues += '\n'
      portValues += `      buf_${parameterFlatName} : ${direction} std_logic ${semicolon}`
   }
   
   // internal signals section
   let internalSignalsDeclarations = ''
   module.equipotentials.forEach(function(equipotential) {
      if (!equipotential.isInput && !equipotential.isOutput) {
         let signalName = equipotentialName(equipotential.index, module.equipotentials)
         let comment = equipotential.name ? ` -- ${equipotential.name}` : ''
         if (internalSignalsDeclarations.length > 0) internalSignalsDeclarations += '\n'
         internalSignalsDeclarations += `   signal ${signalName} : std_logic;${comment}`
      }
   })
   
   // RAM types & addresses declaration
   let memSignalsDeclarations = ''
   // collect all ram blocks using their indexes
   let ramBlockArray = []
   module.equipotentials.forEach(function(equipotential) {
      if (!equipotential.isInput) {
         if (equipotential.type === 'rom') {
            let memUUID = equipotential.memUUID
            if (ramBlockArray[memUUID] === undefined) ramBlockArray[memUUID] = {
               // all equipotentials of type 'rom' with same uuid share same addresses
               type: 'rom',
               addrs: equipotential.addrs,
               dout: [],
            }
            ramBlockArray[memUUID].dout.push(equipotential.index)
         } else if (equipotential.type === 'ram_aread_swrite') {
            let memUUID = equipotential.memUUID
            if (ramBlockArray[memUUID] === undefined) ramBlockArray[memUUID] = {
               // all equipotentials of type 'ram_aread_swrite' with same uuid share same clock, write and addresses
               type: 'ram_aread_swrite',
               clk: equipotential.clk,
               wr: equipotential.wr,
               addrs: equipotential.addrs,
               din: [],
               dout: [],
            }
            ramBlockArray[memUUID].din.push(equipotential.din)
            ramBlockArray[memUUID].dout.push(equipotential.index)
         }
      }
   })
   // check for memory file
   let memoryContentsArray
   if (options.memfile) {
      let memoryFileContents = await fs.promises.readFile(options.memfile)
      memoryContentsArray = JSON.parse(memoryFileContents)
   } else {
      // no memory file: provide null contents for each block
      memoryContentsArray = ramBlockArray.map(block => null)
   }
   // write declarations
   for (let blockIndex = 0; blockIndex < ramBlockArray.length; blockIndex++) {
      let ramblock = ramBlockArray[blockIndex]
      let contentsDict = memoryContentsArray[blockIndex]
      let scontents = ''
      if (contentsDict !== null) {
         let values = []
         for (let addr = Math.pow(2, ramblock.addrs.length) - 1; addr >= 0; addr--) {
            let saddr = addr.toString(2).padStart(ramblock.addrs.length, '0')
            let value = contentsDict[saddr]
            if (addr < 10) {
               addr += 0
            }
            let svalue = (value === undefined)
               ? "0".padStart(ramblock.dout.length, '0')
               : strToBin(value, ramblock.dout.length)
            values.push(svalue)
         }
         let svalues = values.map(value => `"${value}"`).join(', ')
         scontents = ` := (${svalues})`
      }
      memSignalsDeclarations += `   type ram_type_${blockIndex} is array (${Math.pow(2, ramblock.addrs.length)-1} downto 0) of std_logic_vector(${ramblock.dout.length-1} downto 0);
signal RAM_${blockIndex}: ram_type_${blockIndex}${scontents};
signal addrs_${blockIndex}: std_logic_vector(${ramblock.addrs.length-1} downto 0);
signal dout_${blockIndex}: std_logic_vector(${ramblock.dout.length-1} downto 0);
`
   }

   // buffer signals declarations section
   let outBufferSignalsDeclarations = ''
   let alreadyDeclared = []
   for (let i = 0; i < parameterCount; i++) {
      let parameterName = parametersNameAtIndex(parameterList, i)
      let equipotentialIndex = module.equipotentials['__' + parameterName]
      if (alreadyDeclared.indexOf(equipotentialIndex) !== -1) continue
      alreadyDeclared.push(equipotentialIndex)
      let equipotential = module.equipotentials[equipotentialIndex]
      let eqName = equipotentialName(equipotential.index, module.equipotentials)
      if (outBufferSignalsDeclarations.length > 0) outBufferSignalsDeclarations += '\n'
      outBufferSignalsDeclarations += `   signal ${eqName} : std_logic;`
   }

   // buffer signals statements section
   let bufferSignalsStatements = ''
   for (let i = 0; i < parameterCount; i++) {
      let parameterName = parametersNameAtIndex(parameterList, i)
      let signal = board.signals.find(signal => signal.shdlName == parameterName)
      let equipotentialIndex = module.equipotentials['__' + parameterName]
      let equipotential = module.equipotentials[equipotentialIndex]
      let eqName = equipotentialName(equipotential.index, module.equipotentials)
      let parameterFlatName = parameterName.replace('[', '_').replace(']', '')
      if (bufferSignalsStatements.length > 0) bufferSignalsStatements += '\n'
      let direction = signalDirection(signal, equipotential)
      if (direction === 'in') {
         bufferSignalsStatements += `   ${eqName} <= buf_${parameterFlatName};`
      } else {
         bufferSignalsStatements += `   buf_${parameterFlatName} <= ${eqName};`
      }
   }

   // concurrent statements section
   let concurrentStatements = ''
   module.equipotentials.forEach(function(equipotential) {
      if (!equipotential.isInput) {
         let eqName = equipotentialName(equipotential.index, module.equipotentials)
         if (equipotential.type === 'combinatorial') {
            let equation = combinatorialEquation(equipotential.formula, module.equipotentials)
            let comment = equipotential.name ? ` -- ${equipotential.name}` : ''
            if (concurrentStatements.length > 0) concurrentStatements += '\n'
            concurrentStatements += `   ${eqName} <= ${equation};${comment}`
         } else if (equipotential.type === 'constant') {
            let value = `'${equipotential.cvalue}'`
            if (concurrentStatements.length > 0) concurrentStatements += '\n'
            concurrentStatements += `   ${eqName} <= ${value};`
         }
      }
   })

   // tri-state statements section
   let triStateStatements = ''
   module.equipotentials.forEach(function(equipotential) {
      if (!equipotential.isInput) {
         let eqName = equipotentialName(equipotential.index, module.equipotentials)
         if (equipotential.type === 'tri-state') {
            let comment = equipotential.name ? `-- ${equipotential.name}` : ''
            if (triStateStatements.length > 0) triStateStatements += '\n'
            triStateStatements += `   ${comment}`
            let eqName = equipotentialName(equipotential.index, module.equipotentials)
            for (let source of equipotential.sources) {
               let srcEqName = equipotentialName(source.srcEquipotential, module.equipotentials)
               let oeEqName = equipotentialName(source.oeEquipotential, module.equipotentials)
               if (triStateStatements.length > 0) triStateStatements += '\n'
               triStateStatements += `   ${eqName} <= ${srcEqName} when ${oeEqName} = '1' else 'Z';`
            }
         }
      }
   })

   // sequential statements section
   let sequentialStatements = ''
   module.equipotentials.forEach(function(equipotential) {
      if (!equipotential.isInput) {
         if (equipotential.type === 'sequential') {
            let eqName = equipotentialName(equipotential.index, module.equipotentials)
            let clk = equipotentialName(equipotential.clk, module.equipotentials)
            let rst = equipotential.rst !== undefined && equipotentialName(equipotential.rst, module.equipotentials)
            let set = equipotential.set !== undefined && equipotentialName(equipotential.set, module.equipotentials)
            let en = equipotential.en !== undefined && equipotentialName(equipotential.en, module.equipotentials)
            let evolutionEquation = combinatorialEquation(equipotential.formula, module.equipotentials)
            let comment = equipotential.name ? ` -- ${equipotential.name}` : ''
            let sequentialStatement = `  ${comment}
process (${clk}, ${rst || set}) begin
   if ${rst || set} = '1' then
      ${eqName} <= ${set ? "'1'" : "'0'"} ;
   elsif ${clk}'event and ${clk} = '1'${en ? " and " + en + " = '1'" : ''} then
      ${eqName} <= ${evolutionEquation};
   end if ;
end process ;
`
            if (sequentialStatements.length > 0) sequentialStatements += '\n'
            sequentialStatements += sequentialStatement
         }
      }
   })

   // RAM & ROM statements
   let memStatements = ''
   for (let blockIndex = 0; blockIndex < ramBlockArray.length; blockIndex++) {
      let ramblock = ramBlockArray[blockIndex]

      if (ramblock.type === 'rom') {
         let addrs = ramblock.addrs.map(index => equipotentialName(index, module.equipotentials)).join("&")

         memStatements += `   addrs_${blockIndex}(${ramblock.addrs.length-1} downto 0) <= (${addrs});
dout_${blockIndex} <= RAM_${blockIndex}(conv_integer(addrs_${blockIndex}));
`
         ramblock.dout.forEach(function(index, i) {
            memStatements += `   ${equipotentialName(index, module.equipotentials)} <= dout_${blockIndex}(${ramblock.dout.length-i-1});
`
         })

      } else if (ramblock.type === 'ram_aread_swrite') {
         let clk = equipotentialName(ramblock.clk, module.equipotentials)
         let wr = equipotentialName(ramblock.wr, module.equipotentials)
         let addrs = ramblock.addrs.map(index => equipotentialName(index, module.equipotentials)).join("&")
         let din = ramblock.din.map(index => equipotentialName(index, module.equipotentials)).join("&")

         memStatements += `   addrs_${blockIndex}(${ramblock.addrs.length-1} downto 0) <= (${addrs});
process (${clk}) begin
   if ${clk}'event and ${clk} = '1' then
      if ${wr} = '1' then
         RAM_${blockIndex}(conv_integer(addrs_${blockIndex})) <= ${din};
      end if;
   end if;
end process;
dout_${blockIndex} <= RAM_${blockIndex}(conv_integer(addrs_${blockIndex}));
`
         ramblock.dout.forEach(function(index, i) {
            memStatements += `   ${equipotentialName(index, module.equipotentials)} <= dout_${blockIndex}(${ramblock.dout.length-i-1});
`
         })
      }
   }

   // build vhdl from template
   let vhdl = `library ieee;
use ieee.std_logic_1164.all;
use ieee.std_logic_unsigned.all;

entity ${moduleName} is
port (
${portValues}
);
end ${moduleName};

architecture synthesis of ${moduleName} is

-- internal signals declarations
${internalSignalsDeclarations}

-- RAM signal declarations
${memSignalsDeclarations}

-- buffer signals declarations
${outBufferSignalsDeclarations}

begin

-- buffer signals statements
${bufferSignalsStatements}

-- concurrent statements
${concurrentStatements}

-- tri-state statements
${triStateStatements}

-- sequential statements
${sequentialStatements}

-- RAM statements
${memStatements}

end synthesis;
`
   if (options.verbose) console.log(`Created /tmp/${moduleFile}.vhd`)
   fs.promises.writeFile(`/tmp/${moduleFile}.vhd`, vhdl)

   // create tcl Vivado script file
   let tclScript = `
set module ${moduleName}
set modulefile ${moduleFile}
set partname ${board.fpga.fullname}
create_project $module -in_memory -part $partname
add_files /tmp/$modulefile.vhd
read_xdc /tmp/$modulefile.xdc
synth_design -name $module -top $module -part $partname

#link_design # causes trouble
opt_design
place_design
phys_opt_design
route_design

write_bitstream -force /tmp/$modulefile.bit

open_hw
connect_hw_server
open_hw_target
set_property PROGRAM.FILE /tmp/$modulefile.bit [get_hw_devices]
program_hw_devices [get_hw_devices]
`
   fs.promises.writeFile(`/tmp/${moduleFile}.tcl`, tclScript)

   // run script
   let command = `${vivadoPath} -mode batch -nolog -nojournal -source /tmp/${moduleFile}.tcl`
   let child = exec(command, {async: true, silent: !options.verbose})
   let hasError = false
   child.stderr.on('data', function(data) {
      hasError = true
      console.log(data.red)
   })
   child.on('exit', function() {
      if (hasError) {
         console.log(`Module ${moduleName} synthesis failed 👎`.red)
      } else {
         console.log(`Module ${moduleName} synthesis successfull 👍`.green)
      }
   })
}


function equipotentialName(equipotentialIndex, equipotentials) {
   return `eq${equipotentialIndex}`
}

function boardSignals(board, equipotentials, equipotentialIndex) {
   let names = getEquipotentialNames(equipotentials, equipotentialIndex).map(name => name.substring(2))
   return board.signals.filter(function(signal) {
      return (names.indexOf(signal.shdlName) !== -1)
   })
}

function combinatorialEquation(formula, equipotentials) {
   if (formula === '0' || formula === '1') {
      return "'" + formula + "'"
   } else if (formula.op === 'maxterm') {
      let eqName = equipotentialName(formula.equipotentialIndex, equipotentials)
      if (formula.inverted) {
         return `(not ${eqName})`
      } else {
         return eqName
      }
   } else if (formula.op === 'or') {
      let equations = formula.args.map(function(partFormula) {
         return combinatorialEquation(partFormula, equipotentials)
      })
      if (equations.length > 1) {
         equations = equations.map(function(equation) {
            return '(' + equation + ')'
         })
      }
      return equations.join(' or ')
   } else if (formula.op === 'and') {
      let equations = formula.args.map(function(partFormula) {
         return combinatorialEquation(partFormula, equipotentials)
      })
      return equations.join(' and ')
   }
}

function signalDirection(signal, equipotential) {
   if (signal.isInput && !signal.isOutput) {
      // input-only board I/O
      return 'in'
   } else if (signal.isOutput && ! signal.isInput) {
      // output-only board I/O
      return 'out'
   }
   // input-output board I/0: equipotential decides
   return equipotential.isInput ? 'in' : 'out'
}
