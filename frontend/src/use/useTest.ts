
import useModel from '/src/use/useModel.ts'

export function useTest() {
   return useModel(import.meta.env.VITE_APP_TEST_IDB, 'test', ['name'])
}
