
import { useModel } from '/src/use/useModel.ts';

// Create singleton model instance
let modelInstance = null

export function useUserSHDLTestRelation(app) {
   if (!modelInstance) {
      const { createModel } = useModel(app);
      modelInstance = createModel(import.meta.env.VITE_APP_USER_SHDLTEST_RELATION_IDB, 'user_shdltest_relation', ['user_uid', 'shdl_test_uid', 'date', 'success', 'evaluation']);
   }
   return modelInstance;
}
