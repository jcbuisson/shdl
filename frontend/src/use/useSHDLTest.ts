
import { useModel } from '/src/use/useModel.ts';

// Create singleton model instance
let modelInstance = null

export function useSHDLTest(app) {
   if (!modelInstance) {
      const { createModel } = useModel(app);
      modelInstance = createModel(import.meta.env.VITE_APP_SHDL_TEST_IDB, 'shdl_test', ['name']);
   }
   return modelInstance;
}
