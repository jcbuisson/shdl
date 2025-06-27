
const parser = require('./parser.js')
//const request = require('sync-request')
const utilities = require('./shdlUtilities.js')
const _ = require('lodash')
const axios = require('axios')


module.exports = (function() {

   return {
      pegParse,
      pegParseDeep,
      //fetchModuleTreeFromServer,

      checkStructure,
   }

   ///////////////////////////////////       PEG PARSING           ///////////////////////////////////

   // syntactic analysis by PegJS
   function pegParse(moduleText) {
      try {
         let structure = parser.parse(moduleText)
         return { err: null, structure: structure }
      } catch(err) {
         return { err: err, structure: null }
      }
   }

   // Perform a peg parsing of `rootModule` and all its submodules
   // Returns a list of modules, unordered
   // Each module of the returned list has its syntactic structure set to its .structure attribute
   function pegParseDeep(rootModuleName, name2module) {
      let toCheck = [rootModuleName]
      let checked = []
      while (toCheck.length > 0) {
         // get and remove first module from `toCheck`
         let moduleNameToCheck = toCheck[0]
         toCheck.splice(0, 1)
         // check its syntax
         let moduleToCheck = name2module[moduleNameToCheck]
         let { structure, err: syntacticError } = pegParse(moduleToCheck.text)
         if (syntacticError) {
            // return error and analysed modules so far
            checked.push(moduleNameToCheck)
            return {
               err: rootModuleName === moduleNameToCheck ? syntacticError : {
                  message: `*** syntax error in submodule '${moduleNameToCheck}'`,
                  location: null,
               },
               moduleList: checked.map(name => name2module[name]),
            }
         }
         // add `module` to `checked`
         moduleToCheck.structure = structure
         checked.push(moduleNameToCheck)
         // get submodule names
         let submoduleNames = structure.instances.filter(function(instance) {
            return instance.type === 'module_instance'
         }).map(function(instance) {
            return instance.name
         })
         // remove duplicates
         submoduleNames = _.uniq(submoduleNames)
         
         // add each submodule to `toCheck` 
         for (let i = 0; i < submoduleNames.length; i++) {
            let submoduleName = submoduleNames[i]
            if (name2module[submoduleName]) {
               let alreadyChecked = checked.indexOf(submoduleName) !== -1
               if (!alreadyChecked) toCheck.push(submoduleName)
            } else {
               return {
                  err: {
                     message: `*** error: unknown module '${submoduleName}'`,
                     location: null,
                  },
                  moduleList: checked.map(name => name2module[name]),
               }
            }
         }
      }
      return {
         err: null,
         moduleList: checked.map(name => name2module[name]),
      }
   }

   
   ///////////////////////////////////       STRUCTURE CHECKING           ///////////////////////////////////

   function checkStructure(moduleName, name2module) {
      let structure = name2module[moduleName].structure
      let err
      err = checkParameters(structure.params)
      if (err) return err
      for (let i = 0; i < structure.instances.length; i++) {
         let instance = structure.instances[i]
         if (instance.type === 'assignment') {
            err = checkAssignment(instance)
         } else if (instance.type === 'memory_point') {
            err = checkMemoryPoint(instance)
         } else if (instance.type === 'tri_state') {
            err = checkTriState(instance)
         } else if (instance.type === 'module_instance') {
            err = checkModuleInstance(instance, name2module)
         } else if (instance.type === 'predefined_module_instance') {
            err = checkPredefinedModuleInstance(instance)
         }
         if (err) return err
      }
   }

   function checkParameters(params) {
      // check that vector start/stop are in decreasing order
      let badParam = params.find(function(param) {
         if (param.type !== 'vector') return false
         if (param.start >= param.stop) return false
         return true
      })
      if (badParam) {
         return {
            message: `indexes for vector parameter '${badParam.name}' must be in decreasing order`,
            location: badParam.location,
         }
      }
   }

   function checkAssignment(assignment) {
      // check that vector indexes are in decreasing order in left signal compound
      let err = checkSignalCompoundIndexOrdering(assignment.leftCompound)
      if (err) return err
      // check right-hand sum-of-terms compound: decreasing vector indexes, same arity for all terms in sum-of-terms
      err = checkSumOfTermsCompound(assignment.rightCompound)
      if (err) return err
      // check that arity is the same on both sides
      let leftArity = utilities.signalCompoundArity(assignment.leftCompound)
      let rightArity = utilities.sumOfTermsCompoundArity(assignment.rightCompound)
      if (leftArity !== rightArity) {
         return {
            message: `left side of assignment has an arity of ${leftArity} whereas right side has an arity of ${rightArity}`,
            location: assignment.leftCompound.location,
         }
      }
   }

   function checkMemoryPoint(memoryPoint) {
      // check that vector indexes are in decreasing order in left part
      let err = checkSignalCompoundIndexOrdering(memoryPoint.q)
      if (err) return err
      // check right-hand sum-of-terms compound: decreasing vector indexes, same arity for all terms in sum-of-terms
      err = checkSumOfTermsCompound(memoryPoint.d)
      if (err) return err
      // check that arity is the same on both sides
      let leftArity = utilities.signalCompoundArity(memoryPoint.q)
      let rightArity = utilities.sumOfTermsCompoundArity(memoryPoint.d)
      if (leftArity !== rightArity) {
         return {
            message: `left side of memory point assignment has an arity of ${leftArity} whereas right side has an arity of ${rightArity}`,
            location: memoryPoint.q.location,
         }
      }
      // check that arity of 'rst' is 1
      let rstArity = utilities.sumOfTermsArity(memoryPoint.rst)
      if (rstArity !== 1) {
         return {
            message: `the signal ${memoryPoint.rst.name} must be a scalar, whereas it has an arity of ${rstArity}`,
            location: memoryPoint.rst.location,
         }
      }
      // check that arity of 'clk' is 1
      let clkArity = utilities.sumOfTermsArity(memoryPoint.clk)
      if (clkArity !== 1) {
         return {
            message: `the clock signal ${memoryPoint.rst.name} must be a scalar, whereas it has an arity of ${clkArity}`,
            location: memoryPoint.rst.location,
         }
      }
      if (memoryPoint.en) {
         // check that arity of 'en' is 1
         let enArity = utilities.sumOfTermsArity(memoryPoint.en)
         if (enArity !== 1) {
            return {
               message: `the clock signal ${memoryPoint.rst.name} must be a scalar, whereas it has an arity of ${clkArity}`,
               location: memoryPoint.rst.location,
            }
         }
      }
   }

   function checkTriState(assignment) {
      // check that vector indexes are in decreasing order in left signal compound
      let err = checkSignalCompoundIndexOrdering(assignment.leftCompound)
      if (err) return err
      // check right-hand sum-of-terms compound: decreasing vector indexes, same arity for all terms in sum-of-terms
      err = checkSumOfTermsCompound(assignment.rightCompound)
      if (err) return err
      // check that arity is the same on both sides
      let leftArity = utilities.signalCompoundArity(assignment.leftCompound)
      let rightArity = utilities.sumOfTermsCompoundArity(assignment.rightCompound)
      if (leftArity !== rightArity) {
         return {
            message: `left side of tri-state assignment has an arity of ${leftArity} whereas right side has an arity of ${rightArity}`,
            location: assignment.leftCompound.location,
         }
      }
   }

   function checkModuleInstance(moduleInstance, name2module) {
      let arguments_ = moduleInstance.arguments
      let parameters = name2module[moduleInstance.name].structure.params
      if (arguments_.length !== parameters.length) {
         return {
            message: `wrong number of arguments; there should be ${parameters.length} instead of ${arguments_.length}`,
            location: moduleInstance.location,
         }
      }
      for (let i = 0; i < parameters.length; i++) {
         let argumentArity = utilities.argumentArity(arguments_[i])
         let parameterArity = utilities.parameterArity(parameters[i])
         if (argumentArity !== parameterArity) {
            return {
               message: `argument #${i+1} should have an arity of ${parameterArity} instead of ${argumentArity}`,
               location: moduleInstance.location,
            }
         }
      }
   }


   function checkPredefinedModuleInstance(moduleInstance) {
      if (moduleInstance.name === 'ram_aread_swrite') {
         return checkRamAreadSwrite(moduleInstance)
      } else if (moduleInstance.name === 'rom') {
         return undefined
      } else {
         return {
            message: `unknown built-in module ${moduleInstance.name}`,
            location: moduleInstance.location,
         }
      }
   }

   function checkRamAreadSwrite(moduleInstance) {
      // check that 1st argument (clk) has arity 1
      let clkArity = utilities.argumentArity(moduleInstance.arguments[0])
      if (clkArity !== 1) {
         return {
            message: `the first argument (clock) ${moduleInstance.arguments[0]} must be a scalar`,
            location: moduleInstance.location,
         }
      }
      // check that 2nd argument (wr) has arity 1
      let wrArity = utilities.argumentArity(moduleInstance.arguments[1])
      if (wrArity !== 1) {
         return {
            message: `the second argument (write) ${moduleInstance.arguments[1]} must be a scalar`,
            location: moduleInstance.location,
         }
      }
      // check that 4th argument (din) and 5th argument (dout) have same arity
      let dinArity = utilities.argumentArity(moduleInstance.arguments[3])
      let doutArity = utilities.argumentArity(moduleInstance.arguments[4])
      if (dinArity !== doutArity) {
         return {
            message: `the fourth argument (data-in) ${moduleInstance.arguments[3]} and the fifth argument (data-out) ${moduleInstance.arguments[4]} must have same arity`,
            location: moduleInstance.location,
         }
      }
   }

   function checkSignalCompoundIndexOrdering(signalCompound) {
      for (let i = 0; i < signalCompound.signals.length; i++) {
         let signal = signalCompound.signals[i]
         if (signal.type === 'vector') {
            let err = checkVectorSignalIndexOrdering(signal)
            if (err) return err
         }
      }
   }

   function checkSumOfTermsCompound(sumoftermsCompound) {
      for (let i = 0; i < sumoftermsCompound.sumofterms.length; i++) {
         let sumofterms = sumoftermsCompound.sumofterms[i]
         let err = checkSumOfTermsIndexOrdering(sumofterms)
         if (err) return err
         err = checkSumOfTermsArities(sumofterms)
         if (err) return err
      }
   }

   function checkSumOfTermsIndexOrdering(sumofterms) {
      for (let i = 0; i < sumofterms.terms.length; i++) {
         let term = sumofterms.terms[i]
         for (let j = 0; j < term.factors.length; j++) {
            let factor = term.factors[j]
            if (factor.type === 'sumofterms') {
               let err = checkSumOfTermsIndexOrdering(factor.sumofterms)
               if (err) return err
            } else if (factor.type === 'maxterm') {
               if (factor.signal.type === 'vector') {
                  let err = checkVectorSignalIndexOrdering(factor.signal)
                  if (err) return err
               }
            }
         }
      }
   }

   function checkVectorSignalIndexOrdering(signal) {
      if (signal.start < signal.stop) {
         return {
            message: `indexes for vector signal '${signal.name}' must be in decreasing order`,
            location: signal.location
         }
      }
   }

   function checkSumOfTermsArities(sumofterms) {
      let firstTermArity
      for (let i = 0; i < sumofterms.terms.length; i++) {
         let term = sumofterms.terms[i]
         if (i === 0) {
            firstTermArity = utilities.termArity(term)
         } else {
            if (utilities.termArity(term) !== firstTermArity) {
               return {
                  message: `term arity issue`,
                  location: term.location
               }
            }
         }
      }
   }


})()
