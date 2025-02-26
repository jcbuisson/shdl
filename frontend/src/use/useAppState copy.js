
// import { useSessionStorage } from '@vueuse/core'
import { useIDBKeyval } from '@vueuse/integrations/useIDBKeyval'

// state backed in SessionStorage
const initialState = () => ({
   isAuthenticated: undefined,
   unrecoverableError: false,
   connectedToServer: undefined,
   spinnerWaitingText: null,
})

// export const appState = useSessionStorage('app-state', initialState(), { mergeDefaults: true })
export const { data: appState } = useIDBKeyval('app-state', initialState(), { mergeDefaults: true })

export const resetUseAppState = () => {
   appState.value = initialState()
}
