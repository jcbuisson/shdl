
import crapsParser from './parser.js'
import _ from 'lodash'
import * as binutils from '../binutils.js'


const op2bin = {
   add:    '000000',
   addcc:  '010000',
   sub:    '000100',
   subcc:  '010100',
   umulcc: '011010',
   and:    '000001',
   andcc:  '010001',
   or:     '000010',
   orcc:   '010010',
   xor:    '000011',
   xorcc:  '010011',
   slr:    '001101',
   sll:    '001110',
}

const cond2bin = {
   a:    '1000',
   e:    '0001',
   eq:   '0001',
   z:    '0001',
   ne:   '1001',
   nz:   '1001',
   neg:  '0110',
   n:    '0110',
   pos:  '1110',
   nn:   '1110',
   cs:   '0101',
   cc:   '1101',
   vs:   '0111',
   vc:   '1111',
   g:    '1010',
   gt:   '1010',
   ge:   '1011',
   l:    '0011',
   lt:   '0011',
   le:   '0010',
   gu:   '1100',
   geu:  '1101',
   lu:   '0101',
   leu:  '0100',
}

export function checkModule(module, name2module) {

      // syntactic analysis by PegJS
      let lines
      try {
         lines = crapsParser.parse(module.text)
         console.log('lines', lines)
      } catch(err) {
         let errorMsg = ''
         if (err.location) {
            errorMsg = 'Line ' + err.location.start.line + ', column ' + err.location.start.column + ': '
         }
         errorMsg += err.message
         return { errorMsg: errorMsg }
      }

      // first pass to get all labels and constants, check statements and compute addresses
      console.log('PASS1')
      let currentAddress = 0
      let symbols = {}
      try {
         lines.forEach(function(line) {
            // console.log('line', line)
            // line starts with a label
            if (line.label) {
               let labelName = line.label
               let labelEntry = symbols[labelName]
               // check if it is already defined and has a value
               if (labelEntry && labelEntry.value !== null) {
                  let message = `*** error line ${line.lineno}: symbol '${labelName}' already defined`
                  throw new Error(message)
               } else {
                  labelEntry = { type: 'label', value: currentAddress }
                  symbols[labelName] = labelEntry
               }
            }
            // check each statement
            if (line.directive) {
               checkDirective(line.directive, line.lineno)
            } else if (line.instruction) {
               checkInstruction(line.instruction, line.lineno)
            } else if (line.synthetic) {
               checkSynthetic(line.synthetic, line.lineno)
            }
         })
         // now all symbols should have a value
         for (let labelName in symbols) {
            let labelEntry = symbols[labelName]
            if (labelEntry.value === null) {
               let message = `*** error: symbol '${labelName}' is referenced but not defined`
               throw new Error(message)
            }
         }
      } catch(err) {
         return { errorMsg: err.message }
      }
   
      // second pass to compute all memory values
      console.log('PASS2')
      let memory = {}
      currentAddress = 0
      try {
         lines.forEach(function(line) {
            // console.log('linex', line)
            // handle each type of lines
            if (line.directive) {
               assembleDirective(line)
            } else if (line.instruction) {
               assembleInstruction(line)
            } else if (line.synthetic) {
               assembleSynthetic(line)
            }
         })
      } catch(err) {
         return { errorMsg: err.message }
      }

      return { errorMsg: null, lines: lines, symbols: symbols, memory: memory }



      function checkDirective(directive, lineno) {
         if (directive.code === 'org') {
            // change current address
            currentAddress = numExprValue(directive.address, symbols)
            
         } else if (directive.code === 'word') {
            currentAddress += directive.values.length
               
         } else if (directive.code === 'equ') {
            // add a new entry into symbols table
            let constantEntry = symbols[directive.label]
            if (constantEntry && constantEntry.value !== null) {
               let message = `*** error line ${lineno}: symbol '${directive.label}' already defined`
               throw new Error(message)
            }
            constantEntry = { type: 'constant', value: directive.value }
            symbols[directive.label] = constantEntry
         }
      }

      function assembleDirective(line) {
         let directive = line.directive
         let lineno = line.lineno
         if (directive.code === 'org') {
            // change current address
            currentAddress = numExprValue(directive.address, symbols)
            
         } else if (directive.code === 'word') {
            // add values in memory
            directive.values.forEach(function(numexpr, index) {
               if (memory[currentAddress]) {
                  let message = `*** error line ${lineno}: memory is multiply assigned at address ${currentAddress}`
                  throw new Error(message)
               }
               let binaryString
               let value = numExprValue(numexpr, symbols)
               if (value < 0) {
                  binaryString = (value >>> 0).toString(2)
               } else {
                  binaryString = _.padStart(parseInt(value, 10).toString(2), 32, '0')
               }
               let label = index === 0 ? line.label : ''
               let memoryEntry = { text: line.text, label: label, value: binaryString }
               memory[currentAddress] = memoryEntry
               currentAddress += 1
            })
               
         } else if (directive.code === 'equ') {
            // already done at pass1
         }
      }

      function checkInstruction(instruction, lineno) {
         // check limits
         if (instruction.rs1) {
            if (instruction.rs1 < 0 || instruction.rs1 > 31) {
               let message = `*** error line ${lineno}: register index of '%r${instruction.rs1}' must be in [0..31]`
               throw new Error(message)
            }
         }
         if (instruction.rs2) {
            if (instruction.rs2 < 0 || instruction.rs2 > 31) {
               let message = `*** error line ${lineno}: register index of '%r${instruction.rs2}' must be in [0..31]`
               throw new Error(message)
            }
         }
         if (instruction.rd) {
            if (instruction.rd < 0 || instruction.rd > 31) {
               let message = `*** error line ${lineno}: register index of '%r${instruction.rd}' must be in [0..31]`
               throw new Error(message)
            }
         }
         if (instruction.type === 'instructionBcc') {
            let targetEntry = symbols[instruction.label]
            if (!targetEntry) {
               symbols[instruction.label] = { type: 'label', value: null }
            }
         }
         // increment current address
         currentAddress += 1
      }

      function assembleInstruction(line) {
         let instruction = line.instruction
         if (instruction.simm13) {
            // replace instruction.simm13 by its evaluation, so that the simulator won't have to compute it
            try {
               instruction.simm13 = numExprValue(instruction.simm13, symbols)
            } catch(error) {
               let message = `*** error line ${lineno}: ${error.message}`
               throw new Error(message)
            }
            if (instruction.simm13 < -4096 || instruction.simm13 > 4095) {
               let message = `*** error line ${lineno}: 13-bit immediate value '${instruction.simm13}' must be in [-4096..4095]`
               throw new Error(message)
            }
         }
         if (instruction.imm24) {
            try {
               // replace instruction.imm24 by its evaluation, so that the simulator won't have to compute it
               instruction.imm24 = numExprValue(instruction.imm24, symbols)
            } catch(error) {
               let message = `*** error line ${lineno}: ${error.message}`
               throw new Error(message)
            }
            if (instruction.imm24 < 0 || instruction.imm24 > 16777216) {
               let message = `*** error line ${lineno}: 24-bit value '${instruction.imm24}' must be in [0..16777216]`
               throw new Error(message)
            }
         }

         let memoryEntry
         let label = line.label ? line.label : ''
         if (instruction.type === 'instructionArithLog1a') {
            let rs1 = _.padStart(parseInt(instruction.rs1, 10).toString(2), 5, '0')
            let rs2 = _.padStart(parseInt(instruction.rs2, 10).toString(2), 5, '0')
            let rd = _.padStart(parseInt(instruction.rd, 10).toString(2), 5, '0')
            let op = op2bin[instruction.codeop]
            let code = `10${rd}${op}${rs1}000000000${rs2}`
            memoryEntry = { label: label, value: code, instruction: instruction, synthetic: null }

         } else if (instruction.type === 'instructionArithLog1b') {
            let rs1 = _.padStart(parseInt(instruction.rs1, 10).toString(2), 5, '0')
            let simm13
            if (instruction.simm13 < 0) {
               simm13 = (instruction.simm13 >>> 0).toString(2).substring(19)
            } else {
               simm13 = _.padStart(parseInt(instruction.simm13, 10).toString(2), 13, '0')
            }
            let rd = _.padStart(parseInt(instruction.rd, 10).toString(2), 5, '0')
            let op = op2bin[instruction.codeop]
            let code = `10${rd}${op}${rs1}1${simm13}`
            memoryEntry = { label: label, value: code, instruction: instruction, synthetic: null }

         } else if (instruction.type === 'instructionLoad1a') {
            let rs1 = _.padStart(parseInt(instruction.rs1, 10).toString(2), 5, '0')
            let rs2 = _.padStart(parseInt(instruction.rs2, 10).toString(2), 5, '0')
            let rd = _.padStart(parseInt(instruction.rd, 10).toString(2), 5, '0')
            let code = `11${rd}000000${rs1}000000000${rs2}`
            memoryEntry = { label: label, value: code, instruction: instruction, synthetic: null }

         } else if (instruction.type === 'instructionLoad1b') {
            let rs1 = _.padStart(parseInt(instruction.rs1, 10).toString(2), 5, '0')
            let simm13
            if (instruction.plusMinus === '-') {
               simm13 = (-instruction.simm13 >>> 0).toString(2).substring(19)
            } else {
               simm13 = _.padStart(parseInt(instruction.simm13, 10).toString(2), 13, '0')
            }
            let rd = _.padStart(parseInt(instruction.rd, 10).toString(2), 5, '0')
            let op = op2bin[instruction.codeop]
            let code = `11${rd}000000${rs1}1${simm13}`
            memoryEntry = { label: label, value: code, instruction: instruction, synthetic: null }

         } else if (instruction.type === 'instructionStore1a') {
            let rs1 = _.padStart(parseInt(instruction.rs1, 10).toString(2), 5, '0')
            let rs2 = _.padStart(parseInt(instruction.rs2, 10).toString(2), 5, '0')
            let rd = _.padStart(parseInt(instruction.rd, 10).toString(2), 5, '0')
            let code = `11${rd}000100${rs1}000000000${rs2}`
            memoryEntry = { label: label, value: code, instruction: instruction, synthetic: null }

         } else if (instruction.type === 'instructionStore1b') {
            let rs1 = _.padStart(parseInt(instruction.rs1, 10).toString(2), 5, '0')
            let simm13
            if (instruction.plusMinus === '-') {
               simm13 = (-instruction.simm13 >>> 0).toString(2).substring(19)
            } else {
               simm13 = _.padStart(parseInt(instruction.simm13, 10).toString(2), 13, '0')
            }
            let rd = _.padStart(parseInt(instruction.rd, 10).toString(2), 5, '0')
            let op = op2bin[instruction.codeop]
            let code = `11${rd}000100${rs1}1${simm13}`
            memoryEntry = { label: label, value: code, instruction: instruction, synthetic: null }

         } else if (instruction.type === 'instructionBcc') {
            let target = symbols[instruction.label]
            let disp = target.value - currentAddress
            instruction.disp = disp
            let disp25
            if (disp < 0) {
               disp25 = (disp >>> 0).toString(2).substring(7)
            } else {
               disp25 = _.padStart(parseInt(disp, 10).toString(2), 25, '0')
            }
            let cond = cond2bin[instruction.cond]
            let code = `001${cond}${disp25}`
            memoryEntry = { label: label, value: code, instruction: instruction, synthetic: null }

         } else if (instruction.type === 'instructionSethi') {
            let rd = _.padStart(parseInt(instruction.rd, 10).toString(2), 5, '0')
            let imm24Value = _.padStart(parseInt(instruction.imm24, 10).toString(2), 24, '0')
            let code = `000${rd}${imm24Value}`
            memoryEntry = { label: label, value: code, instruction: instruction, synthetic: null }

         } else if (instruction.type === 'instructionReti') {
            let code = '01000000000000000000000000000000'
            memoryEntry = { label: label, value: code, instruction: instruction, synthetic: null }
         }
         // copy instruction code in memory
         memory[currentAddress] = memoryEntry
         // increment current address
         currentAddress += 1
      }

      function checkSynthetic(synthetic, lineno) {
         if (synthetic.rs < 0 || synthetic.rs > 31) {
            let message = `*** error line ${lineno}: register index of '%r${synthetic.rs}' must be in [0..31]`
            throw new Error(message)
         }
         if (synthetic.rd < 0 || synthetic.rd > 31) {
            let message = `*** error line ${lineno}: register index of '%r${synthetic.rd}' must be in [0..31]`
            throw new Error(message)
         }
         if (synthetic.type === 'clr') {
            currentAddress += 1
         } else if (synthetic.type === 'mov') {
            currentAddress += 1
         } else if (synthetic.type === 'inc' || synthetic.type === 'inccc' || synthetic.type === 'dec' || synthetic.type === 'deccc') {
            currentAddress += 1
         } else if (synthetic.type === 'setq') {
            currentAddress += 1
         } else if (synthetic.type === 'set') {
            currentAddress += 2
         } else if (synthetic.type === 'cmp') {
            currentAddress += 1
         } else if (synthetic.type === 'tst') {
            currentAddress += 1
         } else if (synthetic.type === 'negcc') {
            currentAddress += 1
         } else if (synthetic.type === 'nop') {
            currentAddress += 1
         } else if (synthetic.type === 'call') {
            let targetEntry = symbols[synthetic.label]
            if (!targetEntry) {
               symbols[synthetic.label] = { type: 'label', value: null }
            }
            currentAddress += 2
         } else if (synthetic.type === 'rcall') {
            let targetEntry = symbols[synthetic.label]
            if (!targetEntry) {
               symbols[synthetic.label] = { type: 'label', value: null }
            }
            currentAddress += 6
         } else if (synthetic.type === 'ret') {
            currentAddress += 1
         } else if (synthetic.type === 'push') {
            currentAddress += 2
         } else if (synthetic.type === 'pop') {
            currentAddress += 2
         }
      }

      function assembleSynthetic(line) {
         let synthetic = line.synthetic
         if (synthetic.simm13) {
            // replace synthetic.simm13 by its evaluation, so that the simulator won't have to compute it
            try {
               synthetic.simm13 = numExprValue(synthetic.simm13, symbols)
            } catch(error) {
               let message = `*** error line ${line.lineno}: ${error.message}`
               throw new Error(message)
            }
            if (synthetic.simm13 < -4096 || synthetic.simm13 > 4095) {
               let message = `*** error line ${line.lineno}: 13-bit immediate value '${synthetic.simm13}' must be in [-4096..4095]`
               throw new Error(message)
            }
         }
         if (synthetic.simm32) {
            // replace synthetic.simm32 by its evaluation, so that the simulator won't have to compute it
            try {
               synthetic.simm32 = numExprValue(synthetic.simm32, symbols)
            } catch(error) {
               let message = `*** error line ${line.lineno}: ${error.message}`
               throw new Error(message)
            }
            if (synthetic.simm32 < -2147483648 || synthetic.simm32 > 4294967295) {
               let message = `*** error line ${line.lineno}: immediate value ${synthetic.simm32} must be in [-2147483648..4294967295]`
               throw new Error(message)
            }
         }
         
         let memoryEntry
         let label = line.label ? line.label : ''
         if (synthetic.type === 'clr') {
            let rd = _.padStart(parseInt(synthetic.rd, 10).toString(2), 5, '0')
            let code = `10${rd}0100100000000000000000000`
            memoryEntry = { label: null, value: code, instruction: null, synthetic: synthetic }
            memory[currentAddress++] = memoryEntry
         } else if (synthetic.type === 'mov') {
            let rs = _.padStart(parseInt(synthetic.rs, 10).toString(2), 5, '0')
            let rd = _.padStart(parseInt(synthetic.rd, 10).toString(2), 5, '0')
            let code = `10${rd}010010${rs}00000000000000`
            memoryEntry = { label: label, value: code, instruction: null, synthetic: synthetic }
            memory[currentAddress++] = memoryEntry
         } else if (synthetic.type === 'inc') {
            let rd = _.padStart(parseInt(synthetic.rd, 10).toString(2), 5, '0')
            let code = `10${rd}0000000000010000000000001`
            memoryEntry = { label: label, value: code, instruction: null, synthetic: synthetic }
            memory[currentAddress++] = memoryEntry
         } else if (synthetic.type === 'inccc') {
            let rd = _.padStart(parseInt(synthetic.rd, 10).toString(2), 5, '0')
            let code = `10${rd}0100000000010000000000001`
            memoryEntry = { label: label, value: code, instruction: null, synthetic: synthetic }
            memory[currentAddress++] = memoryEntry
         } else if (synthetic.type === 'dec') {
            let rd = _.padStart(parseInt(synthetic.rd, 10).toString(2), 5, '0')
            let code = `10${rd}0001000000010000000000001`
            memoryEntry = { label: label, value: code, instruction: null, synthetic: synthetic }
            memory[currentAddress++] = memoryEntry
         } else if (synthetic.type === 'deccc') {
            let rd = _.padStart(parseInt(synthetic.rd, 10).toString(2), 5, '0')
            let code = `10${rd}0101000000010000000000001`
            memoryEntry = { label: label, value: code, instruction: null, synthetic: synthetic }
            memory[currentAddress++] = memoryEntry
         } else if (synthetic.type === 'setq') {
            let rd = _.padStart(parseInt(synthetic.rd, 10).toString(2), 5, '0')
            let simm13Value = binutils.signedToBin13(synthetic.simm13)
            let code = `10${rd}010010${rd}1${simm13Value}`
            memoryEntry = { label: label, value: code, instruction: null, synthetic: synthetic }
            memory[currentAddress++] = memoryEntry
         } else if (synthetic.type === 'set') {
            let rd = _.padStart(parseInt(synthetic.rd, 10).toString(2), 5, '0')
            let imm32Value = binutils.unsignedToBin32(synthetic.simm32)
            let code1 = `000${rd}${imm32Value.substring(0, 24)}`
            memoryEntry = { label: label, value: code1, instruction: null, synthetic: synthetic }
            memory[currentAddress++] = memoryEntry
            let code2 = `10${rd}010010${rd}100000${imm32Value.substring(24)}`
            memoryEntry = { label: null, value: code2, instruction: null, synthetic: null }
            memory[currentAddress++] = memoryEntry
         } else if (synthetic.type === 'cmp') {
            let rs = _.padStart(parseInt(synthetic.rs, 10).toString(2), 5, '0')
            let code
            if (synthetic.rd) {
               let rd = _.padStart(parseInt(synthetic.rd, 10).toString(2), 5, '0')
               code = `1000000010100${rs}000000000${rd}`
            } else {
               let simm13Value = binutils.signedToBin13(synthetic.simm13)
               code = `1000000010100${rs}1${simm13Value}`
            }
            memoryEntry = { label: label, value: code, instruction: null, synthetic: synthetic }
            memory[currentAddress++] = memoryEntry
         } else if (synthetic.type === 'tst') {
            let rs = _.padStart(parseInt(synthetic.rs, 10).toString(2), 5, '0')
            let code = `1000000010100${rs}00000000000000`
            memoryEntry = { label: label, value: code, instruction: null, synthetic: synthetic }
            memory[currentAddress++] = memoryEntry
         } else if (synthetic.type === 'negcc') {
            let rd = _.padStart(parseInt(synthetic.rd, 10).toString(2), 5, '0')
            let code = `10${rd}01010000000000000000${rd}`
            memoryEntry = { label: label, value: code, instruction: null, synthetic: synthetic }
            memory[currentAddress++] = memoryEntry
         } else if (synthetic.type === 'nop') {
            let code = '00000000000000000000000000000000'
            memoryEntry = { label: label, value: code, instruction: null, synthetic: synthetic }
            memory[currentAddress++] = memoryEntry
         } else if (synthetic.type === 'call') {
            let target = symbols[synthetic.label]
            let disp = target.value - currentAddress - 1
            synthetic.disp = disp
            let disp25
            if (disp < 0) {
               disp25 = (disp >>> 0).toString(2).substring(7)
            } else {
               disp25 = _.padStart(parseInt(disp, 10).toString(2), 25, '0')
            }
            let code1 = `10111000000100000000000000011110`
            memoryEntry = { label: label, value: code1, instruction: null, synthetic: synthetic }
            memory[currentAddress++] = memoryEntry
            let code2 = `0101000${disp25}`
            memoryEntry = { label: null, value: code2, instruction: null, synthetic: null }
            memory[currentAddress++] = memoryEntry
         } else if (synthetic.type === 'rcall') {
            let target = symbols[synthetic.label]
            let disp = target.value - currentAddress - 1
            synthetic.disp = disp
            let disp25
            if (disp < 0) {
               disp25 = (disp >>> 0).toString(2).substring(7)
            } else {
               disp25 = _.padStart(parseInt(disp, 10).toString(2), 25, '0')
            }
            let code1 = `10111010001001110110000000000001`
            memoryEntry = { label: label, value: code1, instruction: null, synthetic: synthetic }
            memory[currentAddress++] = memoryEntry
            let code2 = `11111000001001110100000000000000`
            memoryEntry = { label: null, value: code2, instruction: null, synthetic: null }
            memory[currentAddress++] = memoryEntry
            let code3 = `10111000000100000000000000011110`
            memoryEntry = { label: null, value: code3, instruction: null, synthetic: synthetic }
            memory[currentAddress++] = memoryEntry
            let code4 = `0101000${disp25}`
            memoryEntry = { label: null, value: code4, instruction: null, synthetic: null }
            memory[currentAddress++] = memoryEntry
            let code5 = `11111000000001110100000000000000`
            memoryEntry = { label: null, value: code5, instruction: null, synthetic: synthetic }
            memory[currentAddress++] = memoryEntry
            let code6 = `10111010000001110110000000000001`
            memoryEntry = { label: null, value: code6, instruction: null, synthetic: null }
            memory[currentAddress++] = memoryEntry
         } else if (synthetic.type === 'ret') {
            let code = `10111100000001110010000000000001`
            memoryEntry = { label: label, value: code, instruction: null, synthetic: synthetic }
            memory[currentAddress++] = memoryEntry
         } else if (synthetic.type === 'push') {
            let rs = _.padStart(parseInt(synthetic.rs, 10).toString(2), 5, '0')
            let code1 = `10111010001001110110000000000001`
            memoryEntry = { label: label, value: code1, instruction: null, synthetic: synthetic }
            memory[currentAddress++] = memoryEntry
            let code2 = `11${rs}0001001110100000000000000`
            memoryEntry = { label: null, value: code2, instruction: null, synthetic: null }
            memory[currentAddress++] = memoryEntry
         } else if (synthetic.type === 'pop') {
            let rd = _.padStart(parseInt(synthetic.rd, 10).toString(2), 5, '0')
            let code1 = `11${rd}0000001110100000000000000`
            memoryEntry = { label: label, value: code1, instruction: null, synthetic: synthetic }
            memory[currentAddress++] = memoryEntry
            let code2 = `10111010000001110110000000000001`
            memoryEntry = { label: null, value: code2, instruction: null, synthetic: null }
            memory[currentAddress++] = memoryEntry
         }
      }


      // function numExprSymbols(numexpr) {
      //    if (typeof(numexpr) === 'number') {
      //       return []
      //    } else if (typeof(numexpr) === 'string') {
      //       return [numexpr]
      //    } else {
      //       return numExprSymbols(numexpr.arg1).concat(numExprSymbols(numexpr.arg2))
      //    }
      // }

      function numExprValue(numexpr, symbols) {
         if (typeof(numexpr) === 'number') {
            return numexpr
         } else if (typeof(numexpr) === 'string') {
            let symbolEntry = symbols[numexpr]
            if (symbolEntry) {
               return symbolEntry.value
            } else {
               throw new Error(`symbol ${numexpr} is undefined`)
            }
         } else if (numexpr.op === '+') {
            return numExprValue(numexpr.arg1, symbols) + numExprValue(numexpr.arg2, symbols)
         } else if (numexpr.op === '-') {
            return numExprValue(numexpr.arg1, symbols) - numExprValue(numexpr.arg2, symbols)
         } else if (numexpr.op === '*') {
            return numExprValue(numexpr.arg1, symbols) * numExprValue(numexpr.arg2, symbols)
         } else if (numexpr.op === '/') {
            return numExprValue(numexpr.arg1, symbols) / numExprValue(numexpr.arg2, symbols)
         }
      }

}
