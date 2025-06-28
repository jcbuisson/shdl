import { termArity, signalCompoundArity, sumOfTermsCompoundArity, argumentArity, parameterArity } from '/src/lib/shdl/shdlUtilities'


export function checkStructure(moduleName, structureMap) {
   const structure = structureMap[moduleName]
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
         err = checkModuleInstance(instance, structureMap)
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

function checkModuleInstance(moduleInstance, structureMap) {
      let arguments_ = moduleInstance.arguments
      let parameters = structureMap[moduleInstance.name].params
      if (arguments_.length !== parameters.length) {
         return {
            message: `wrong number of arguments; there should be ${parameters.length} instead of ${arguments_.length}`,
            location: moduleInstance.location,
         }
      }
      for (let i = 0; i < parameters.length; i++) {
         let argArity = argumentArity(arguments_[i])
         let paramArity = parameterArity(parameters[i])
         if (argArity !== paramArity) {
            return {
               message: `argument #${i+1} should have an arity of ${paramArity} instead of ${argArity}`,
               location: moduleInstance.location,
            }
         }
      }
}
