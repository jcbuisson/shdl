   
// equipotentials is both an array and a mapping
export function createEquipotential(name, equipotentials) {
   let index = equipotentials.length
   let equipotential = {
      name: name,
      index: index,
   }
   addEquipotential(equipotential, equipotentials)
   return equipotential
}

// equipotentials is both an array and a mapping
export function addEquipotential(equipotential, equipotentials) {
   let index = equipotentials.length
   equipotential.index = index
   // add equipotential as an array element
   equipotentials.push(equipotential)
   // add mapping name -> equipotential
   if (equipotential.name !== null) {
      equipotentials["__" + equipotential.name] = index
   }
   return index
}

export function equipotentialCount(module) {
   return module.equipotentials.reduce(function(accu, equipotential) {
      return accu + 1
   }, 0)
}

export function getEquipotentialNames(equipotentials, equipotentialIndex) {
   let result = []
   for (let key in equipotentials) {
      if (!isNaN(key)) continue
      if (equipotentials[key] === equipotentialIndex) {
         result.push(key)
      }
   }
   return result
}


export function unusedEquipotentialCount(module) {
   return module.equipotentials.reduce(function(accu, equipotential) {
      if (equipotential.isUnused) {
         return accu + 1
      } else {
         return accu
      }
   }, 0)
}

export function signalCompoundArity(signalCompound) {
   return signalCompound.signals.reduce(function(accu, signal) {
      return accu + signalArity(signal)
   }, 0)
}

export function sumOfTermsCompoundArity(sumOfTermsCompound) {
   return sumOfTermsCompound.sumofterms.reduce(function(accu, term) {
      return accu + sumOfTermsArity(term)
   }, 0)
}

export function sumOfTermsArity(sumOfTerms) {
   return termArity(sumOfTerms.terms[0])
}

export function termArity(term) {
   let arities = term.factors.map(function(factor) { return factorArity(factor) })
   // return max value (they are supposed to be all 1 or a common value)
   return arities.reduce(function (p, v) {
      return ( p > v ? p : v )
   })
}

export function factorArity(factor) {
   if (factor.type === 'bitfield') {
      return factor.value.length
   } else if (factor.type === 'maxterm') {
      return signalArity(factor.signal)
   } else if (factor.type === 'sumofterms') {
      return sumOfTermsArity(factor.sumofterms)
   }
}

export function signalArity(signal) {
   if (signal.type === 'scalar') {
      return 1
   } else if (signal.type === 'vector') {
      return signal.start - signal.stop + 1
   }
}

export function signalCompoundAtIndex(signalCompound, index) {
   let currIndex = 0
   for (let i = 0; i < signalCompound.signals.length; i++) {
      let signal = signalCompound.signals[i]
      if (signal.type === 'scalar') {
         if (index === currIndex) {
            return signal.name
         }
         currIndex += 1
      } else if (signal.type === 'vector') {
         for (let j = signal.start; j >= signal.stop; j--) {
            if (index === currIndex) {
               return `${signal.name}[${j}]`
            }
            currIndex += 1
         }
      }
   }
}

export function sumoftermsCompoundAtIndex(sumOfTermsCompound, index) {
   let currIndex = 0
   for (let i = 0; i < sumOfTermsCompound.sumofterms.length; i++) {
      let sumofterms = sumOfTermsCompound.sumofterms[i]
      let arity = sumOfTermsArity(sumofterms)
      if (index < currIndex + arity) {
         return { sumofterms: sumofterms, localindex: index - currIndex }
      }
      currIndex += arity
   }
}

export function simplifyFormula(formula) {
   if (formula.op === 'or' && formula.args.length === 1) {
      return simplifyFormula(formula.args[0])
   } else if (formula.op === 'and' && formula.args.length === 1) {
      return simplifyFormula(formula.args[0])
   } else {
      return formula
   }
}

export function parameterArity(parameter) {
   if (parameter.type === 'scalar') {
      return 1
   } else if (parameter.type === 'vector') {
      return parameter.start - parameter.stop + 1
   }
}

export function parametersArity(parameterList) {
   return parameterList.reduce(function(accu, parameter) {
      return accu + parameterArity(parameter)
   }, 0)
   
}

export function parameterNameAtIndex(parameter, index) {
   if (parameter.type === 'scalar') {
      return parameter.name
   } else if (parameter.type === 'vector') {
      return `${parameter.name}[${parameter.start - index}]`
   }
}

export function parametersNameAtIndex(parameterList, index) {
   let currIndex = 0
   for (let i = 0; i < parameterList.length; i++) {
      let parameter = parameterList[i]
      if (parameter.type === 'scalar') {
         if (index === currIndex) return parameter.name
         currIndex += 1
      } else if (parameter.type === 'vector') {
         for (let k = 0; k < parameter.start - parameter.stop + 1; k++) {
            if (index === currIndex) return `${parameter.name}[${parameter.start-k}]`
            currIndex += 1
         }
      }
   }
}

export function argumentsArity(argumentList) {
   return argumentList.reduce(function(accu, argument) {
      return accu + argumentArity(argument)
   }, 0)
}

export function argumentArity(argument) {
   return argument.signalorliterals.reduce(function(accu, signalOrLiteral) {
      let arity = signalOrLiteral.type === 'literal' ? signalOrLiteral.value.length : signalArity(signalOrLiteral)
      return accu + arity
   }, 0)
}

// return a scalar signal name (string, such as 'a[2]') or a literal value (string '>0' or '>1')
export function argumentAtIndex(argumentList, index) {
   let currIndex = 0
   for (let i = 0; i < argumentList.length; i++) {
      let argument = argumentList[i]
      for (let j = 0; j < argument.signalorliterals.length; j++) {
         let signalorliteral = argument.signalorliterals[j]
         if (signalorliteral.type === 'scalar') {
            if (index === currIndex) return signalorliteral.name
            currIndex += 1
         } else if (signalorliteral.type === 'vector') {
            for (let k = 0; k < signalorliteral.start - signalorliteral.stop + 1; k++) {
               if (index === currIndex) return `${signalorliteral.name}[${signalorliteral.start-k}]`
               currIndex += 1
            }
         } else {
            // literal
            for (let k = 0; k < signalorliteral.value.length; k++) {
               if (index === currIndex) {
                  return signalorliteral.value[k] === '1' ? '>1' : '>0'
               }
               currIndex += 1
            }
         }
      }
   }
}

export function argumentAt(argument, index) {
   let currIndex = 0
   for (let j = 0; j < argument.signalorliterals.length; j++) {
      let signalorliteral = argument.signalorliterals[j]
      if (signalorliteral.type === 'scalar') {
         if (index === currIndex) return signalorliteral.name
         currIndex += 1
      } else if (signalorliteral.type === 'vector') {
         for (let k = 0; k < signalorliteral.start - signalorliteral.stop + 1; k++) {
            if (index === currIndex) return `${signalorliteral.name}[${signalorliteral.start-k}]`
            currIndex += 1
         }
      } else {
         // literal
         for (let k = 0; k < signalorliteral.value.length; k++) {
            if (index === currIndex) {
               return signalorliteral.value[k] === '1' ? '>1' : '>0'
            }
            currIndex += 1
         }
      }
   }
}

export function getOriginalEquipotentialIndex(equipotentialIndex, equipotentials) {
   let equipotential = equipotentials[equipotentialIndex]
   if (equipotential.type === 'alias') {
      return equipotential.aliasIndex
   }
   return equipotentialIndex
}

export function getOriginalEquipotential(equipotential, equipotentials) {
   if (equipotential.type === 'alias') {
      return equipotentials[equipotential.aliasIndex]
   }
   return equipotential
}

export function replaceAliases(formula, equipotentials) {
   if (formula.op === 'or' || formula.op === 'and') {
      formula.args.forEach(f => {
         replaceAliases(f, equipotentials)
      })
   } else if (formula.op === 'maxterm') {
      formula.equipotentialIndex = getOriginalEquipotentialIndex(formula.equipotentialIndex, equipotentials)
      // let eq = equipotentials[formula.equipotentialIndex]
      // if (eq.type === 'alias') {
      //    formula.equipotentialIndex = eq.aliasIndex
      // }
   }
}

export function updateFormulaIndexes(formula, mapping) {
   if (formula.op === 'or' || formula.op === 'and') {
      formula.args.forEach(f => {
         updateFormulaIndexes(f, mapping)
      })
   } else if (formula.op === 'maxterm') {
      if (mapping.hasOwnProperty(formula.equipotentialIndex)) {
         formula.equipotentialIndex = mapping[formula.equipotentialIndex]
      }
   }
}

export function addUsedBy(module) {
   module.equipotentials.forEach(equipotential => {
      if (equipotential.type === 'combinatorial') {
         addUsedByFormula(equipotential, equipotential.formula, module.equipotentials)
      } else if (equipotential.type === 'sequential') {
         addUsedByFormula(equipotential, equipotential.formula, module.equipotentials)
         // addUsedByFormula(equipotential, equipotential.clk, module.equipotentials)
         let clkEquipotential = module.equipotentials[equipotential.clk]
         addUsedByEquipotential(equipotential, clkEquipotential)
         if (equipotential.rst) {
            let rstEquipotential = module.equipotentials[equipotential.rst]
            addUsedByEquipotential(equipotential, rstEquipotential)
         }
         if (equipotential.set) {
            let setEquipotential = module.equipotentials[equipotential.set]
            addUsedByEquipotential(equipotential, setEquipotential)
         }
         if (equipotential.en) {
            let enEquipotential = module.equipotentials[equipotential.en]
            addUsedByEquipotential(equipotential, enEquipotential)
         }
      } else if (equipotential.type === 'tri-state') {
         equipotential.sources.forEach(function(source) {
            let srcEquipotential = module.equipotentials[source.srcEquipotential]
            addUsedByEquipotential(equipotential, srcEquipotential)
            let oeEquipotential = module.equipotentials[source.oeEquipotential]
            addUsedByEquipotential(equipotential, oeEquipotential)
         })
      } else if (equipotential.type === 'ram_aread_swrite') {
         addUsedByEquipotential(equipotential, module.equipotentials[equipotential.clk])
         addUsedByEquipotential(equipotential, module.equipotentials[equipotential.wr])
         addUsedByEquipotential(equipotential, module.equipotentials[equipotential.din])
         equipotential.addrs.forEach(function(addr) {
            addUsedByEquipotential(equipotential, module.equipotentials[addr])
         })
      }
   })
}

export function addUsedByFormula(targetEquipotential, formula, equipotentials) {
   if (formula.op === 'or' || formula.op === 'and') {
      formula.args.forEach(f => {
         addUsedByFormula(targetEquipotential, f, equipotentials)
      })
   } else if (formula.op === 'maxterm') {
      let usedEquipotential = equipotentials[formula.equipotentialIndex]
      addUsedByEquipotential(targetEquipotential, usedEquipotential)
   }
}

export function addUsedByEquipotential(targetEquipotential, usedEquipotential) {
   if (usedEquipotential['usedBy'] === undefined) usedEquipotential.usedBy = []
   if (targetEquipotential['uses'] === undefined) targetEquipotential.uses = []
   if (usedEquipotential.usedBy.indexOf(targetEquipotential.index) === -1) usedEquipotential.usedBy.push(targetEquipotential.index)
   if (targetEquipotential.uses.indexOf(usedEquipotential.index) === -1) targetEquipotential.uses.push(usedEquipotential.index)
}

export function addUnused(module) {
   let modified = true
   while (modified) {
      modified = false
      for (let i = 0; i < module.equipotentials.length; i++) {
         let equipotential = module.equipotentials[i]
         if (equipotential === undefined) continue; // empty slot
         if (equipotential['isUnused'] !== undefined) continue // already qualified
         if (equipotential.isInput || equipotential.isOutput) {
            equipotential.isUnused = false
            modified = true
            continue
         }
         if (equipotential['usedBy'] === undefined || equipotential.usedBy.length === 0) {
            // an equipotential with no input/output status and with an undefined or empty 'usedBy' attribute is unused
            equipotential.isUnused = true
            modified = true
            continue
         }
         if (equipotential.usedBy.every(index => {
            let eq = module.equipotentials[index]
            return eq['isUnused']
         })) {
            // an equipotential whose all members of its 'usedBy' attribute are unused, is unused
            equipotential.isUnused = true
            modified = true
            continue
         }
      }
   }
}
