
import { peg$parse } from './parser.js';
import _ from 'lodash';
import axios from 'axios';


function pegParse(moduleText) {
   try {
      let structure = peg$parse(moduleText)
      return { err: null, structure: structure }
   } catch(err) {
      return { err: err, structure: null }
   }
}

async function fetchShdlModule(app, moduleName, userId, options) {
   console.log(`Fetching module ${moduleName}...`)
   const userDocuments = await app.service('user_document').findMany({
      where: {
         user_uid: userId,
         type: 'shdl',
         name: moduleName,
      }
   })
   if (userDocuments.length !== 1) throw { message: `*** could not find module '${moduleName}'` }
   return {
      name: moduleName,
      text: userDocuments[0].text,
   }
}

export async function fetchModuleTreeFromServer(app, rootModuleName, userId, options) {
   let name2module = {}
   let rootModule = await fetchShdlModule(app, rootModuleName, userId, options)
   name2module[rootModuleName] = rootModule
   let toCheck = [rootModule]
   let checked = []
   while (toCheck.length > 0) {
      // get and remove first module from `toCheck`
      let module = toCheck[0]
      toCheck.splice(0, 1)
      // check its syntax
      let { structure, err: syntacticError } = pegParse(module.text)
      if (syntacticError) {
         throw {
            message: `*** syntax error in module '${module.name}'`,
            location: null,
         }
      }
      // add `module` to `checked`
      module.structure = structure
      checked.push(module)
      // get submodule names
      let submoduleNames = structure.instances.filter(function(instance) {
         return instance.type === 'module_instance'
      }).map(function(instance) {
         return instance.name
      })
      // remove duplicates
      submoduleNames = _.uniq(submoduleNames)
      
      // add each submodule to `toCheck` while testing for circularity
      for (let i = 0; i < submoduleNames.length; i++) {
         let submoduleName = submoduleNames[i]
         if (checked.map(module => module.name).indexOf(submoduleName) !== -1) {
            // TODO: debug circularity detection algorithm
            // console.log("SKIPPED CIRCULARITY CHECK")
         }
         if (!name2module[submoduleName]) {
            try {
               let submodule = await fetchShdlModule(app, submoduleName, userId, options)
               name2module[submoduleName] = submodule
               toCheck.push(submodule)
            } catch(error) {
               throw {
                  message: `*** error: unknown module '${submoduleName}'`,
                  location: null,
               }
            }
         }
      }
   }
   return name2module
}
