
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

async function fetchShdlModule(moduleName, userId, teamId, serverUrl, jwt, options) {
   if (options.verbose) console.log(`Fetching module ${moduleName}...`)
   let url = (teamId == 0) ?
      `${serverUrl}/api/shdl-modules/?name=${moduleName}&user=${userId}` :
      `${serverUrl}/api/shdl-modules/?name=${moduleName}&team=${teamId}`
   try {
      let response = await axios({
         method: 'get',
         url: url,
         headers: {"Authorization": `JWT ${jwt}`},
      })
      if (response.data.length === 0) {
         throw { message: `*** could not find module '${moduleName}'` }
      }
      return response.data[0]
   } catch(err) {
      throw err
   }
}

export async function fetchModuleTreeFromServer(rootModuleName, userId, teamId, serverUrl, jwt, options) {
   let name2module = {}
   let rootModule = await fetchShdlModule(rootModuleName, userId, teamId, serverUrl, jwt, options)
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
               let submodule = await fetchShdlModule(submoduleName, userId, teamId, serverUrl, jwt, options)
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
