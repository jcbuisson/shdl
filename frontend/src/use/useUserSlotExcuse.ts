
import useModel from '/src/use/useModel'


export function useUserSlotExcuse() {
   return useModel(import.meta.env.VITE_APP_USER_SLOT_EXCUSE_IDB, 'user_slot_excuse', ['user_uid', 'group_slot_uid'])
}
