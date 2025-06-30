
const shdlSyntax = require('./shdlSyntax.js')
const shdlSemantic = require('./shdlSemantic.js')
const utilities = require('./shdlUtilities.js')
const _ = require('lodash')


module.exports = (function() {

   return {
      checkModule: checkModule,
   }

   function isCircular(moduleName, name2module) {
      let toDevelop = [moduleName]
      while (toDevelop.length > 0) {
         let head = toDevelop[0]
         toDevelop.splice(0, 1)
         let submodule = name2module[head]
         if (submodule.submoduleNames.indexOf(moduleName) !== -1) {
            // circularity!
            return submodule.name
         }
         toDevelop = toDevelop.concat(submodule.submoduleNames)
      }
      return false
   }

   function checkModule(moduleName, name2module) {

      // peg parse of `module` and all its submodules
      let { moduleList, err: pegError } = shdlSyntax.pegParseDeep(moduleName, name2module)
      if (pegError) {
         return {
            err: {
               module: moduleName,
               message: pegError.message,
               location: pegError.location,
            },
            moduleList: moduleList
         }
      }

      // add to each module a .submoduleNames attribute
      moduleList.forEach(module => {
         module.submoduleNames = module.structure.instances.reduce((accu, instance) => {
            return (instance.type === 'module_instance' && accu.indexOf(instance.name) === -1) ? accu.concat([instance.name]) : accu
         }, [])
      })

      // check for circularities
      let circular = isCircular(moduleName, name2module)
      if (circular) {
         return {
            err: {
               module: moduleName,
               message: `Circularity issue with module: '${circular}'`,
               location: null,
            },
            moduleList: moduleList,
         }
      }

      // re-order moduleList, deepest modules first

      // start with leaves
      let orderedModuleNames = moduleList.filter(module => (module.submoduleNames.length === 0)).map(module => module.name)
      moduleList = moduleList.filter(module => (orderedModuleNames.indexOf(module.name) === -1))
      // append to the end of orderedModuleNames the modules of moduleList for which all submodules are already in orderedModuleNames
      while (moduleList.length > 0) {
         moduleList.forEach(module => {
            if (module.submoduleNames.every(name => orderedModuleNames.indexOf(name) !== -1)) {
               orderedModuleNames.push(module.name)
            }
         })
         let l = moduleList.length
         moduleList = moduleList.filter(module => (orderedModuleNames.indexOf(module.name) === -1))
         if (moduleList.length === l) {
            // should never happen
            console.log("*** error when ordering modules")
            break
         }
      }

      //console.log(orderedModuleNames)
      moduleList = orderedModuleNames.map(moduleName => name2module[moduleName])

      // further syntax checking, using peg-parsed structure
      let syntaxError = shdlSyntax.checkStructure(moduleName, name2module)
      if (syntaxError) {
         return {
            err: {
               module: moduleName,
               message: syntaxError.message,
               location: syntaxError.location,
            },
            moduleList: moduleList
         }
      }

      // extract equipotentials, starting with deepest submodules
      for (let i = 0; i < moduleList.length; i++) {
         let submodule = moduleList[i]
         //console.log('collecting', submodule)

         // create module.equipotentials, which is both an array (iterable) and a map: name -> equipotential index
         let instanceError = shdlSemantic.collectEquipotentials(submodule.name, name2module)
         if (instanceError) {
            return { err: instanceError, moduleList: moduleList }
         }
         // check or set the type of all equipotentials and parameters
         let typeError = shdlSemantic.checkIOStatus(submodule)
         if (typeError) {
            return {
               err: {
                  module: submodule.name,
                  message: typeError.message,
                  location: typeError.location,
               },
               moduleList: moduleList
            }
         }
         // add usedBy attributes
         utilities.addUsedBy(submodule)
         // add isUnused attributes
         utilities.addUnused(submodule)
         //console.log(submodule.name, submodule.equipotentials)
      }

      //console.log('module', name2module[moduleName])

      // return all module list (module and submodules) in order for ShdlEditor to update their status
      return { err: null, moduleList: moduleList }
   } 

})()
