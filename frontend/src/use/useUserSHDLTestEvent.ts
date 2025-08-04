
import useModel from '/src/use/useModel'

export function useUserSHDLTestEvent() {
   return useModel(import.meta.env.VITE_APP_USER_SHDLTEST_EVENT_IDB, 'user_shdltest_event', ['user_uid', 'shdl_test_uid', 'date', 'success'])
}
