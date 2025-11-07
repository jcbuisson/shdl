
import { useModel } from '/src/use/useModel.ts';


export function useGroupSlot(app) {
   const { createModel } = useModel(app);

   return createModel(import.meta.env.VITE_APP_GROUP_SLOT_IDB, 'group_slot', ['group_uid', 'name', 'start', 'end'])
}
