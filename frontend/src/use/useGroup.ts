
import { useModel } from '/src/use/useModel.ts';

// Create singleton model instance
let modelInstance = null

export function useGroup(app) {
   if (!modelInstance) {
      const { createModel } = useModel(app);
      modelInstance = createModel(import.meta.env.VITE_APP_GROUP_IDB, 'group', ['name']);
   }
   return modelInstance;
}
