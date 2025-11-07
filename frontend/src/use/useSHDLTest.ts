
import { useModel } from '/src/use/useModel.ts';

export function useSHDLTest(app) {
   const { createModel } = useModel(app);

   return createModel(import.meta.env.VITE_APP_SHDL_TEST_IDB, 'shdl_test', ['name'])
}
