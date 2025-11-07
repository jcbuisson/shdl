
import { useModel } from '/src/use/useModel.ts';


export function useGroup(app) {
   const { createModel } = useModel(app);
   return createModel(import.meta.env.VITE_APP_GROUP_IDB, 'group', ['name']);
}
