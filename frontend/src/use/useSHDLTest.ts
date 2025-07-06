
import useModel from '/src/use/useModel.ts'

export function useSHDLTest() {
   return useModel(import.meta.env.VITE_APP_SHDL_TEST_IDB, 'shdl_test', ['name'])
}
