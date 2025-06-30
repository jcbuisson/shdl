import { termArity, signalCompoundArity, sumOfTermsCompoundArity, argumentArity, parameterArity } from '/src/lib/shdl/shdlUtilities'


export function checkSyntax(moduleName, moduleMap) {
   const structure = moduleMap[moduleName].structure
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
         err = checkModuleInstance(instance, moduleMap)
      } else if (instance.type === 'predefined_module_instance') {
         err = checkPredefinedModuleInstance(instance)
      }
      if (err) return err
   }
}

////////////////////////////////               PARAMETERS             ////////////////////////////////.

function checkParameters(params) {
   // check that vector start/stop are in decreasing order
   let badParam = params.find(function(param) {
      if (param.type !== 'vector') return false
      if (param.start >= param.stop) return false
      return true
   })
   if (badParam) {
      return {
         message: `les indices du vecteur '${badParam.name}' doivent être en ordre décroissant`,
         location: badParam.location,
      }
   }
}

////////////////////////////////               ASSIGNMENTS             ////////////////////////////////.

function checkAssignment(assignment) {
   // check that vector indexes are in decreasing order in left signal compound
   let err = checkSignalCompoundIndexOrdering(assignment.leftCompound)
   if (err) return err
   // check right-hand sum-of-terms compound: decreasing vector indexes, same arity for all terms in sum-of-terms
   err = checkSumOfTermsCompound(assignment.rightCompound)
   if (err) return err
   // check that arity is the same on both sides
   let leftArity = signalCompoundArity(assignment.leftCompound)
   let rightArity = sumOfTermsCompoundArity(assignment.rightCompound)
   if (leftArity !== rightArity) {
      return {
         message: `la partie gauche de l'affectation a une arité de ${leftArity} tandis que la partie droite a une arité de ${rightArity}`,
         location: assignment.leftCompound.location,
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

function checkSignalCompoundIndexOrdering(signalCompound) {
   for (let i = 0; i < signalCompound.signals.length; i++) {
      let signal = signalCompound.signals[i]
      if (signal.type === 'vector') {
         let err = checkVectorSignalIndexOrdering(signal)
         if (err) return err
      }
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
         message: `les indices du vecteur '${signal.name}' doivent être en ordre décroissant`,
         location: signal.location
      }
   }
}

function checkSumOfTermsArities(sumofterms) {
   let firstTermArity
   for (let i = 0; i < sumofterms.terms.length; i++) {
      let term = sumofterms.terms[i]
      if (i === 0) {
         firstTermArity = termArity(term)
      } else {
         if (termArity(term) !== firstTermArity) {
            return {
               message: `term arity issue`,
               location: term.location
            }
         }
      }
   }
}

////////////////////////////////               MODULE INSTANCES             ////////////////////////////////.

function checkModuleInstance(moduleInstance, moduleMap) {
   let arguments_ = moduleInstance.arguments
   let parameters = moduleMap[moduleInstance.name].structure.params
   if (arguments_.length !== parameters.length) {
      return {
         message: `nombre d'arguments incorrects; il devrait y en avoir ${parameters.length} au lieu de ${arguments_.length}`,
         location: moduleInstance.location,
      }
   }
   for (let i = 0; i < parameters.length; i++) {
      let argArity = argumentArity(arguments_[i])
      let paramArity = parameterArity(parameters[i])
      if (argArity !== paramArity) {
         return {
            message: `l'argument #${i+1} devrait avoir une arité de ${paramArity} au lieu de ${argArity}`,
            location: moduleInstance.location,
         }
      }
   }
}

////////////////////////////////               PREDEFINED MODULE INSTANCES             ////////////////////////////////.

function checkPredefinedModuleInstance(moduleInstance) {
   if (moduleInstance.name === 'ram_aread_swrite') {
      return checkRamAreadSwrite(moduleInstance)
   } else if (moduleInstance.name === 'rom') {
      return undefined
   } else {
      return {
         message: `module prédéfini inconnu : ${moduleInstance.name}`,
         location: moduleInstance.location,
      }
   }
}

function checkRamAreadSwrite(moduleInstance) {
   // check that 1st argument (clk) has arity 1
   let clkArity = argumentArity(moduleInstance.arguments[0])
   if (clkArity !== 1) {
      return {
         message: `le premier argument (clock) ${moduleInstance.arguments[0]} devrait être un scalaire et non un vecteur`,
         location: moduleInstance.location,
      }
   }
   // check that 2nd argument (wr) has arity 1
   let wrArity = argumentArity(moduleInstance.arguments[1])
   if (wrArity !== 1) {
      return {
         message: `le deuxième argument (write) ${moduleInstance.arguments[1]} devrait être un scalaire et non un vecteur`,
         location: moduleInstance.location,
      }
   }
   // check that 4th argument (din) and 5th argument (dout) have same arity
   let dinArity = argumentArity(moduleInstance.arguments[3])
   let doutArity = argumentArity(moduleInstance.arguments[4])
   if (dinArity !== doutArity) {
      return {
         message: `le 4ème argument (data-in) ${moduleInstance.arguments[3]} et le 5ème (data-out) ${moduleInstance.arguments[4]} doivent avoir la même arité`,
         location: moduleInstance.location,
      }
   }
}
