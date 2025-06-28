
export function checkStructure(structure) {
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
         err = checkModuleInstance(instance)
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

function checkModuleInstance() {
   
}
