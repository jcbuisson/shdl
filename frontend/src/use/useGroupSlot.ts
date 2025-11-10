
import { useModel } from '/src/use/useModel.ts';

// Create singleton model instance
let modelInstance = null

export function useGroupSlot(app) {
   if (!modelInstance) {
      const { createModel } = useModel(app);
      modelInstance = createModel(import.meta.env.VITE_APP_GROUP_SLOT_IDB, 'group_slot', ['group_uid', 'name', 'start', 'end'])
   }
   return modelInstance;
}
