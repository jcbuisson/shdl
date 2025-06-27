
const utilities = require('./shdlUtilities.js')
const _ = require('lodash')
const uuidv1 = require('uuid/v1')

let uuid = 0

module.exports = (function() {

   return {
      collectEquipotentials: collectEquipotentials,
      checkIOStatus: checkIOStatus,
   }

   // Collect the equipotentials of `module` and set its .equipotentials attribute
   // .equipotentials is both an array (with possible empty slots, but still iterable) and a map (name -> equipotential index)
   // It is supposed that all submodules have already been analysed and their equipotentials completed and simplified
   function collectEquipotentials(moduleName, name2module) {
      let module = name2module[moduleName]
      module.equipotentials = []
      uuid = 0

      // collect equipotentials, possibly creating aliases
      for (let i = 0; i < module.structure.instances.length; i++) {
         let instance = module.structure.instances[i]
         let err
         if (instance.type === 'assignment') {
            err = collectAssignmentEquipotentials(instance, module.equipotentials)
            if (err) return err
         } else if (instance.type === 'memory_point') {
            err = collectMemoryPointEquipotentials(instance, module.equipotentials)
            if (err) return err
         } else if (instance.type === 'tri_state') {
            err = collectTriStateEquipotentials(instance, module.equipotentials)
            if (err) return err
         } else if (instance.type === 'module_instance') {
            err = collectModuleInstanceEquipotentials(instance, module, name2module)
            if (err) return err
         } else if (instance.type === 'predefined_module_instance') {
            err = collectPredefinedModuleInstanceEquipotentials(instance, module.equipotentials)
            if (err) return err
         }
      }

      // update alias indexes in cases of multiple indirections
      module.equipotentials.forEach(equipotential => {
         if (equipotential.type === 'alias') {
            // look for real associated equipotential, following indirections
            let realEquipotential = module.equipotentials[equipotential.aliasIndex]
            while (realEquipotential.type === 'alias') {
               realEquipotential = module.equipotentials[realEquipotential.aliasIndex]
            }
            // update .aliasIndex
            equipotential.aliasIndex = realEquipotential.index
            // update name->equipotential mapping
            module.equipotentials['__' + equipotential.name] = realEquipotential.index
         }
      })

      // in all instances, replace alias references by their target
      module.equipotentials.forEach(function(equipotential) {
         if (equipotential.type === 'combinatorial') {
            utilities.replaceAliases(equipotential.formula, module.equipotentials)
         } else if (equipotential.type === 'sequential') {
            utilities.replaceAliases(equipotential.formula, module.equipotentials)
            equipotential.clk = utilities.getOriginalEquipotentialIndex(equipotential.clk, module.equipotentials)
            if (equipotential.rst) equipotential.rst = utilities.getOriginalEquipotentialIndex(equipotential.rst, module.equipotentials)
            if (equipotential.set) equipotential.set = utilities.getOriginalEquipotentialIndex(equipotential.set, module.equipotentials)
            if (equipotential.en) equipotential.en = utilities.getOriginalEquipotentialIndex(equipotential.en, module.equipotentials)
         } else if (equipotential.type === 'tri-state') {
            equipotential.sources.forEach(function(source) {
               source.srcEquipotential = utilities.getOriginalEquipotentialIndex(source.srcEquipotential, module.equipotentials)
               source.oeEquipotential = utilities.getOriginalEquipotentialIndex(source.oeEquipotential, module.equipotentials)
            })
         } else if (equipotential.type === 'rom' || equipotential.type === 'ram_aread_swrite') {
            equipotential.addrs = equipotential.addrs.map(function(addr) {
               return utilities.getOriginalEquipotentialIndex(addr, module.equipotentials)
            })
            if (equipotential.type === 'ram_aread_swrite') {
               equipotential.clk = utilities.getOriginalEquipotentialIndex(equipotential.clk, module.equipotentials)
               equipotential.wr = utilities.getOriginalEquipotentialIndex(equipotential.wr, module.equipotentials)
               equipotential.din = utilities.getOriginalEquipotentialIndex(equipotential.din, module.equipotentials)
            }
         }
      })

      // remove aliases
      module.equipotentials.forEach(function(equipotential) {
         if (equipotential.type === 'alias') {
            delete module.equipotentials[equipotential.index]
         }
      })
   }

   function collectAssignmentEquipotentials(assignment, equipotentials) {
      // for each signal of assignment
      let arity = utilities.signalCompoundArity(assignment.leftCompound)
      for (let i = 0; i < arity; i++) {
         // get its associated sum of terms and the local index in it
         let leftSignalName = utilities.signalCompoundAtIndex(assignment.leftCompound, i)
         let { sumofterms, localindex } = utilities.sumoftermsCompoundAtIndex(assignment.rightCompound, i)
         // create or complete assigned equipotential
         let equipotentialIndex = equipotentials["__" + leftSignalName]
         let equipotential
         if (equipotentialIndex === undefined) {
            // does not exist yet: create it
            equipotential = utilities.createEquipotential(leftSignalName, equipotentials)
         } else {
            // already exists: complete it
            equipotential = equipotentials[equipotentialIndex]
            if (equipotential.type !== null && !equipotential.isInput) {
               return {
                  message: `signal '${leftSignalName}' is assigned several times`,
                  location: assignment.leftCompound.location,
               }
            }
         }
         // build its associated formula, creating new uncomplete equipotentials when needed
         let formula = sumOfTermsFormula(sumofterms, localindex, equipotentials)
         formula = utilities.simplifyFormula(formula)
         if (formula === "0" || formula === "1") {
            equipotential.type = 'constant'
            equipotential.cvalue = (formula === "0") ? 0 : 1
         } else {
            equipotential.type = 'combinatorial'
            if (formula.op === 'maxterm' && !formula.inverted) {
               // alias
               equipotential.type = 'alias'
               equipotential.aliasIndex = formula.equipotentialIndex
               equipotentials["__" + leftSignalName] = formula.equipotentialIndex
            } else {
               equipotential.formula = formula
            }
         }
      }
   }

   function collectTriStateEquipotentials(assignment, equipotentials) {
      // output enable equipotential
      let oeEquipotential
      let oeFormula = utilities.simplifyFormula(sumOfTermsFormula(assignment.oe, 0, equipotentials))
      if (oeFormula.op === 'maxterm' && !oeFormula.inverted) {
         oeEquipotential = equipotentials[oeFormula.equipotentialIndex]
      } else {
         oeEquipotential = utilities.createEquipotential(null, equipotentials)
         oeEquipotential.type = 'combinatorial'
         oeEquipotential.formula = oeFormula
      }
      // for each signal of assignment
      let arity = utilities.signalCompoundArity(assignment.leftCompound)
      for (let i = 0; i < arity; i++) {
         // get its associated sum of terms and the local index in it
         let leftSignalName = utilities.signalCompoundAtIndex(assignment.leftCompound, i)
         if (leftSignalName === 'areg[4]') {
            leftSignalName = leftSignalName
         }
         let { sumofterms, localindex } = utilities.sumoftermsCompoundAtIndex(assignment.rightCompound, i)
         // create or complete tri-state assigned equipotential
         let triStateEquipotentialIndex = equipotentials["__" + leftSignalName]
         let triStateEquipotential
         if (triStateEquipotentialIndex === undefined) {
            // does not exist yet: create it
            triStateEquipotential = utilities.createEquipotential(leftSignalName, equipotentials)
            triStateEquipotential.type = 'tri-state'
            triStateEquipotential.sources = []
         } else {
            // already exists: complete it
            triStateEquipotential = equipotentials[triStateEquipotentialIndex]
            if (triStateEquipotential.type === 'combinatorial') {
               return {
                  message: `'${leftSignalName}' is assigned both as a combinatorial signal and as a tri-state signal`,
                  location: assignment.leftCompound.location,
               }
            }
            if (triStateEquipotential.type === null) {
               triStateEquipotential.type = 'tri-state'
               triStateEquipotential.sources = []
            }
         }
         // source equipotential
         let srcEquipotential
         let srcFormula = utilities.simplifyFormula(sumOfTermsFormula(sumofterms, localindex, equipotentials))
         if (srcFormula.op === 'maxterm' && !srcFormula.inverted) {
            srcEquipotential = equipotentials[srcFormula.equipotentialIndex]
         } else {
            srcEquipotential = utilities.createEquipotential(null, equipotentials)
            srcEquipotential.type = 'combinatorial'
            srcEquipotential.formula = srcFormula
         }
         // add their 2-uple to sources list
         if (triStateEquipotential.sources === undefined) {
            triStateEquipotential = triStateEquipotential
         }
         triStateEquipotential.sources.push({ srcEquipotential: srcEquipotential.index, oeEquipotential: oeEquipotential.index })
      }
   }

   function collectMemoryPointEquipotentials(memoryPoint, equipotentials) {
      // clk equipotential
      let clkEquipotential
      let clkFormula = utilities.simplifyFormula(sumOfTermsFormula(memoryPoint.clk, 0, equipotentials))
      if (clkFormula.op === 'maxterm' && !clkFormula.inverted) {
         clkEquipotential = equipotentials[clkFormula.equipotentialIndex]
      } else {
         clkEquipotential = utilities.createEquipotential(null, equipotentials)
         clkEquipotential.type = 'combinatorial'
         clkEquipotential.formula = clkFormula
      }
      // rst equipotential
      let rstEquipotential
      let rstFormula = utilities.simplifyFormula(sumOfTermsFormula(memoryPoint.rst, 0, equipotentials))
      if (rstFormula.op === 'maxterm' && !rstFormula.inverted) {
         rstEquipotential = equipotentials[rstFormula.equipotentialIndex]
      } else {
         rstEquipotential = utilities.createEquipotential(null, equipotentials)
         rstEquipotential.type = 'combinatorial'
         rstEquipotential.formula = rstFormula
      }
      let enEquipotential
      if (memoryPoint.en) {
         // en equipotential
         let enFormula = utilities.simplifyFormula(sumOfTermsFormula(memoryPoint.en, 0, equipotentials))
         if (enFormula.op === 'maxterm' && !enFormula.inverted) {
            enEquipotential = equipotentials[enFormula.equipotentialIndex]
         } else {
            enEquipotential = utilities.createEquipotential(null, equipotentials)
            enEquipotential.type = 'combinatorial'
            enEquipotential.formula = enFormula
         }
      }

      // for each signal of left side of ':='
      let arity = utilities.signalCompoundArity(memoryPoint.q)
      for (let i = 0; i < arity; i++) {
         // get its associated sum of terms and the local index in it
         let leftSignalName = utilities.signalCompoundAtIndex(memoryPoint.q, i)
         let { sumofterms, localindex } = utilities.sumoftermsCompoundAtIndex(memoryPoint.d, i)
         // create or complete assigned equipotential
         let equipotential
         let equipotentialIndex = equipotentials["__" + leftSignalName]
         if (equipotentialIndex === undefined) {
            // does not exist yet: create it
            equipotential = utilities.createEquipotential(leftSignalName, equipotentials)
         } else {
            // already exists: complete it
            equipotential = equipotentials[equipotentialIndex]
            if (equipotential.type !== null && !equipotential.isInput) {
               return {
                  message: `signal '${leftSignalName}' is assigned several times`,
                  location: memoryPoint.q.location,
               }
            }
         }
         equipotential.type = 'sequential'
         // build its associated formula, creating new uncomplete equipotentials when needed
         let formula = utilities.simplifyFormula(sumOfTermsFormula(sumofterms, localindex, equipotentials))
         equipotential.formula = formula
         equipotential.clk = clkEquipotential.index
         if (memoryPoint.setReset === 'reset') {
            equipotential.rst = rstEquipotential.index
         } else if (memoryPoint.setReset === 'set') {
            equipotential.set = rstEquipotential.index
         }
         if (enEquipotential) {
            equipotential.en = enEquipotential.index
         }
      }
   }

   function collectModuleInstanceEquipotentials(instance, module, name2module) {
      let submodule = name2module[instance.name]
      let submoduleArity = utilities.argumentsArity(instance.arguments)
      let mapping = {}
      let toApply = []
      // connect input equipotentials, and add outputs equipotentials
      for (let i = 0; i < submoduleArity; i++) {
         let argName = utilities.argumentAtIndex(instance.arguments, i) // argName may be a constant '>0' or '>1'
         let paramName = utilities.parametersNameAtIndex(submodule.structure.params, i)
         let paramIndex = submodule.equipotentials["__" + paramName]
         // check if it has been treated already (alias parameter)
         if (mapping[paramIndex] !== undefined) {
            module.equipotentials["__" + argName] = mapping[paramIndex]
            continue
         }
         let paramEquipotential = submodule.equipotentials[paramIndex]
         if (paramEquipotential.isInput) {
            // input
            // get or create it in module.equipotentials
            let equipotential
            let equipotentialIndex = module.equipotentials["__" + argName]
            if (equipotentialIndex === undefined) {
               equipotential = utilities.createEquipotential(argName, module.equipotentials)
               if (argName === '>0' || argName === '>1') {
                  equipotential.type = 'constant'
                  equipotential.cvalue = (argName === '>0') ? 0 : 1
               } else {
                  equipotential.type = null
               }
            } else {
               equipotential = module.equipotentials[equipotentialIndex]
            }
            // add entry to mapping
            mapping[paramIndex] = equipotential.index
         } else {
            // output or null
            // check first that an equipotential of this name does not already exist
            if (module.equipotentials["__" + argName] === undefined) {
               // copy paramEquipotential
               let equipotentialCopy = {
                  name: argName,
               }
               copySubmoduleEquipotential(paramEquipotential, equipotentialCopy)
               utilities.addEquipotential(equipotentialCopy, module.equipotentials)
               // add entry to mapping
               mapping[paramIndex] = equipotentialCopy.index
               toApply.push(equipotentialCopy)
            } else {
               let eqIndex = module.equipotentials["__" + argName]
               let eq = module.equipotentials[eqIndex]
               if (eq.type !== null) {
                  return {
                     message: `signal '${argName}' is assigned several times`,
                     location: instance.location,
                  }
               }
               copySubmoduleEquipotential(paramEquipotential, eq)
               mapping[paramIndex] = eq.index
               toApply.push(eq)
            }
         }
      }
      // then add remaining, not unused internal submodule equipotentials
      submodule.equipotentials.forEach(submoduleEquipotential => {
         if (!submoduleEquipotential.isUnused && mapping[submoduleEquipotential.index] === undefined) {
            // copy internal equipotential
            let equipotentialCopy = {
               name: null,
            }
            copySubmoduleEquipotential(submoduleEquipotential, equipotentialCopy)
            utilities.addEquipotential(equipotentialCopy, module.equipotentials)
            // add entry to mapping
            mapping[submoduleEquipotential.index] = equipotentialCopy.index
            toApply.push(equipotentialCopy)
         }
      })
      // console.log('toApply', toApply, 'mapping', mapping)
      // apply `mapping` to all equipotentials of `toApply`
      toApply.forEach(equipotential => {
         if (equipotential.type === 'combinatorial') {
            utilities.updateFormulaIndexes(equipotential.formula, mapping)
         } else if (equipotential.type === 'sequential') {
            utilities.updateFormulaIndexes(equipotential.formula, mapping)
            equipotential.clk = mapping[equipotential.clk]
            if (equipotential.rst !== undefined) {
               equipotential.rst = mapping[equipotential.rst]
            }
            if (equipotential.set !== undefined) {
               equipotential.set = mapping[equipotential.set]
            }
            if (equipotential.en !== undefined) {
               equipotential.en = mapping[equipotential.en]
            }
         } else if (equipotential.type === 'tri-state') {
            equipotential.sources.forEach(function(source) {
               source.srcEquipotential = mapping[source.srcEquipotential]
               source.oeEquipotential = mapping[source.oeEquipotential]
            })
         } else if (equipotential.type === 'rom') {
            equipotential.addrs = equipotential.addrs.map(index => mapping[index])
         } else if (equipotential.type === 'ram_aread_swrite') {
            equipotential.clk = mapping[equipotential.clk]
            equipotential.wr = mapping[equipotential.wr]
            equipotential.addrs = equipotential.addrs.map(index => mapping[index])
            equipotential.din = mapping[equipotential.din]
         }
      })
   }

   function copySubmoduleEquipotential(equipotentialSrc, equipotentialDest) {
      equipotentialDest.type = equipotentialSrc.type

      if (equipotentialSrc.type === 'combinatorial') {
         // copy assignment formule
         equipotentialDest.formula = _.cloneDeep(equipotentialSrc.formula)

      } else if (equipotentialSrc.type === 'sequential') {
         // copy evolution formula
         equipotentialDest.formula = _.cloneDeep(equipotentialSrc.formula)
         // link clk equipotential
         equipotentialDest.clk = equipotentialSrc.clk
         // link rst/set/en equipotential, if exists
         if (equipotentialSrc.rst !== undefined) {
            equipotentialDest.rst = equipotentialSrc.rst
         }
         if (equipotentialSrc.set !== undefined) {
            equipotentialDest.set = equipotentialSrc.set
         }
         if (equipotentialSrc.en !== undefined) {
            equipotentialDest.en = equipotentialSrc.en
         }

      } else if (equipotentialSrc.type === 'tri-state') {
         equipotentialDest.sources = equipotentialSrc.sources.map(source => 
            ({ srcEquipotential: source.srcEquipotential, oeEquipotential: source.oeEquipotential })
         )

      } else if (equipotentialSrc.type === 'constant') {
         equipotentialDest.cvalue = equipotentialSrc.cvalue

      } else if (equipotentialSrc.type === 'rom' || equipotentialSrc.type === 'ram_aread_swrite') {
         equipotentialDest.memUUID = equipotentialSrc.memUUID
         equipotentialDest.memOutIndex = equipotentialSrc.memOutIndex
         // link addr equipotentials
         equipotentialDest.addrs = equipotentialSrc.addrs.map(addr => addr)
         // create dict (holds memory values)
         equipotentialDest.dict = {}
         if (equipotentialSrc.type === 'ram_aread_swrite') {
            // link clk, wr & din equipotentials
            equipotentialDest.clk = equipotentialSrc.clk
            equipotentialDest.wr = equipotentialSrc.wr
            equipotentialDest.din = equipotentialSrc.din
         }
      }
      return equipotentialDest
   }

   function collectPredefinedModuleInstanceEquipotentials(predefinedModule, equipotentials) {
      if (predefinedModule.name === 'rom') {
         let memUUID = uuid++
         predefinedModule.memUUID = memUUID
         // addr equipotentials
         let addrs = []
         let addrArity = utilities.argumentArity(predefinedModule.arguments[0])
         for (let i = 0; i < addrArity; i++) {
            let addrName = utilities.argumentAt(predefinedModule.arguments[0], i)
            let addrEquipotentialIndex = equipotentials["__" + addrName]
            if (addrEquipotentialIndex === undefined) {
               let addrEquipotential = utilities.createEquipotential(addrName, equipotentials)
               addrEquipotentialIndex = addrEquipotential.index
               if (addrName === '>0' || addrName === '>1') {
                  addrEquipotential.type = 'constant'
                  addrEquipotential.cvalue = (addrName === '>0') ? 0 : 1
               } else {
                  addrEquipotential.type = null
               }
            }
            addrs.push(addrEquipotentialIndex)
         }
         // data-out equipotentials
         let doutArguments = predefinedModule.arguments[1]
         let doutArity = utilities.argumentArity(doutArguments)
         for (let i = 0; i < doutArity; i++) {
            let doutName = utilities.argumentAt(doutArguments, i)
            if (doutName === '>0' || doutName === '>1') {
               return {
                  message: `data-out argument of instance of $rom cannot contain constants`,
                  location: predefinedModule.location,
               }
            }
            let doutEquipotential
            let doutEquipotentialIndex = equipotentials["__" + doutName]
            if (doutEquipotentialIndex === undefined) {
               doutEquipotential = utilities.createEquipotential(doutName, equipotentials)
            } else {
               doutEquipotential = equipotentials[doutEquipotentialIndex]
            }
            doutEquipotential.type = 'rom'
            doutEquipotential.addrs = addrs
            doutEquipotential.dict = {}
            doutEquipotential.memUUID = memUUID
            doutEquipotential.memOutIndex = doutArity - i - 1
         }

      } else if (predefinedModule.name === 'ram_aread_swrite') {
         let memUUID = uuid++
         predefinedModule.memUUID = memUUID
         // clk equipotential
         let clkName = utilities.argumentAt(predefinedModule.arguments[0], 0)
         let clkEquipotentialIndex = equipotentials["__" + clkName]
         if (clkEquipotentialIndex === undefined) {
            let clkEquipotential = utilities.createEquipotential(clkName, equipotentials)
            clkEquipotentialIndex = clkEquipotential.index
            if (clkName === '>0' || clkName === '>1') {
               clkEquipotential.type = 'constant'
               clkEquipotential.cvalue = (clkName === '>0') ? 0 : 1
            } else {
               clkEquipotential.type = null
            }
         }
         // wr equipotential
         let wrName = utilities.argumentAt(predefinedModule.arguments[1], 0)
         let wrEquipotentialIndex = equipotentials["__" + wrName]
         if (wrEquipotentialIndex === undefined) {
            let wrEquipotential = utilities.createEquipotential(wrName, equipotentials)
            wrEquipotentialIndex = wrEquipotential.index
            if (wrName === '>0' || wrName === '>1') {
               wrEquipotential.type = 'constant'
               wrEquipotential.cvalue = (wrName === '>0') ? 0 : 1
            } else {
               wrEquipotential.type = null
            }
         }
         // addr equipotentials
         let addrs = []
         let addrArity = utilities.argumentArity(predefinedModule.arguments[2])
         for (let i = 0; i < addrArity; i++) {
            let addrName = utilities.argumentAt(predefinedModule.arguments[2], i)
            let addrEquipotentialIndex = equipotentials["__" + addrName]
            if (addrEquipotentialIndex === undefined) {
               let addrEquipotential = utilities.createEquipotential(addrName, equipotentials)
               addrEquipotentialIndex = addrEquipotential.index
               if (addrName === '>0' || addrName === '>1') {
                  addrEquipotential.type = 'constant'
                  addrEquipotential.cvalue = (addrName === '>0') ? 0 : 1
               } else {
                  addrEquipotential.type = null
               }
            }
            addrs.push(addrEquipotentialIndex)
         }
         // data-in / data-out equipotentials
         let dinArity = utilities.argumentArity(predefinedModule.arguments[3])
         for (let i = 0; i < dinArity; i++) {
            let dinName = utilities.argumentAt(predefinedModule.arguments[3], i)
            let dinEquipotentialIndex = equipotentials["__" + dinName]
            if (dinEquipotentialIndex === undefined) {
               let dinEquipotential = utilities.createEquipotential(dinName, equipotentials)
               dinEquipotentialIndex = dinEquipotential.index
               if (dinName === '>0' || dinName === '>1') {
                  dinEquipotential.type = 'constant'
                  dinEquipotential.cvalue = (dinName === '>0') ? 0 : 1
               } else {
                  dinEquipotential.type = null
               }
            }

            let doutName = utilities.argumentAt(predefinedModule.arguments[4], i)
            if (doutName === '>0' || doutName === '>1') {
               return {
                  message: `data-out argument of instance of $ram cannot contain constants`,
                  location: predefinedModule.location,
               }
            }
            let doutEquipotential
            let doutEquipotentialIndex = equipotentials["__" + doutName]
            if (doutEquipotentialIndex === undefined) {
               doutEquipotential = utilities.createEquipotential(doutName, equipotentials)
            } else {
               doutEquipotential = equipotentials[doutEquipotentialIndex]
            }
            doutEquipotential.type = 'ram_aread_swrite'
            doutEquipotential.clk = clkEquipotentialIndex
            doutEquipotential.wr = wrEquipotentialIndex
            doutEquipotential.addrs = addrs
            doutEquipotential.din = dinEquipotentialIndex
            doutEquipotential.dict = {}
            doutEquipotential.memUUID = memUUID
            doutEquipotential.memOutIndex = dinArity - i - 1
         }

      }
   }


   // Create a formula from syntactic description `sumOfTerms`. `i` is a local index in the sum of terms
   // This is where anonymous equipotentials are created
   function sumOfTermsFormula(sumOfTerms, i, equipotentials) {
      let formula = { op: 'or', args: [] }
      sumOfTerms.terms.forEach(function(term) {
         let termFormula = { op: 'and', args: [] }
         term.factors.forEach(function(factor) {
            let factorFormula
            // add computation information
            if (factor.type === 'bitfield') {
               factorFormula = factor.value[i]
            } else if (factor.type === 'maxterm') {
               // get equipotential name
               let equipotentialName
               if (factor.signal.type === 'scalar') {
                  equipotentialName = factor.signal.name
               } else if (factor.signal.type === 'vector') {
                  if (factor.signal.start === factor.signal.stop) {
                     // scalar product
                     equipotentialName = `${factor.signal.name}[${factor.signal.start}]`
                  } else {
                     equipotentialName = `${factor.signal.name}[${factor.signal.start - i}]`
                  }
               }
               let equipotentialIndex = equipotentials["__" + equipotentialName]
               if (equipotentialIndex === undefined) {
                  // create an uncomplete equipotential for this name
                  equipotentialIndex = equipotentials.length
                  let equipotential = {
                     type: null,
                     name: equipotentialName,
                     index: equipotentialIndex,
                  }
                  // `equipotentials` is an array
                  equipotentials.push(equipotential)
                  // and a map
                  equipotentials["__" + equipotentialName] = equipotentialIndex
               }
               factorFormula = {
                  op: 'maxterm',
                  inverted: factor.inverted,
                  equipotentialIndex: equipotentialIndex,
               }
            } else if (factor.type === 'sumofterms') {
               let sotFormula = utilities.simplifyFormula(sumOfTermsFormula(factor.sumofterms, i, equipotentials))
               // create a new, unnamed equipotential
               let equipotentialIndex = equipotentials.length
               let unnamedEquipotential = {
                  type: 'combinatorial',
                  name: null,
                  index: equipotentialIndex,
                  formula: sotFormula,
               }
               equipotentials.push(unnamedEquipotential)
               factorFormula = {
                  op: 'maxterm',
                  inverted: false,
                  equipotentialIndex: equipotentialIndex,
               }
            }
            termFormula.args.push(factorFormula)
         })
         formula.args.push(termFormula)
      })
      return formula
   }


   // Check that all equipotentials have a type (among 'constant', 'combinatorial', 'sequential', 'tri-state', 'ram_aread_swrite')
   // or have type = null and are present in parameters as inputs
   // For each equipotential, set their I/O status
   function checkIOStatus(module) {
      // check that all parameters are present in module.equipotentials
      for (let i = 0; i < module.structure.params.length; i++) {
         let parameter = module.structure.params[i]
         let parameterArity = utilities.parameterArity(parameter)
         for (let j = 0; j < parameterArity; j++) {
            let signalName = utilities.parameterNameAtIndex(parameter, j)
            let equipotentialIndex = module.equipotentials["__" + signalName]
            if (equipotentialIndex === undefined) {
               return {
                  message: `unused parameter ${signalName}`,
                  location: parameter.location
               }
            }
            let equipotential = module.equipotentials[equipotentialIndex]
            if (equipotential.type === null) {
               equipotential.isInput = true
               equipotential.isOutput = false
            } else {
               equipotential.isInput = false
               equipotential.isOutput = true
            }
         }
      }
      // check that all equipotentials with type=null have an input/output status
      for (let i = 0; i < module.equipotentials.length; i++) {
         let equipotential = module.equipotentials[i]
         if (equipotential === undefined) continue; // empty slot (we cannot use forEach because we need 'return')
         if (equipotential.isInput === undefined && equipotential.isOutput === undefined) {
            // equipotential has not input/output status: it cannot be a parameter, they have been handled at the previous step
            if (equipotential.type === null) {
               return {
                  message: `signal '${equipotential.name}' is not a parameter and is not produced`,
                  location: null
               }
            } else {
               // internal equipotential
               equipotential.isInput = false
               equipotential.isOutput = false
            }
         }
      }
   }

})()
