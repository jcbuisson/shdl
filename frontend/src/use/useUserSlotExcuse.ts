
import { useModel } from '/src/use/useModel.ts';

// Create singleton model instance
let modelInstance = null

export function useUserSlotExcuse(app) {
   if (!modelInstance) {
      const { createModel } = useModel(app);
      modelInstance = createModel(import.meta.env.VITE_APP_USER_SLOT_EXCUSE_IDB, 'user_slot_excuse', ['user_uid', 'group_slot_uid']);
   }
   return modelInstance;
}
