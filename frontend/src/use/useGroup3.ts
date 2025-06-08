
import useModel from '/src/use/useModel.ts'

export function useGroup3() {
   return useModel(import.meta.env.VITE_APP_GROUP_IDB, 'group', ['name'])
}
