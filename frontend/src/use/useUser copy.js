import { computed } from 'vue'
import { useIDBKeyval } from '@vueuse/integrations/useIDBKeyval'

import { app } from '/src/client-app.js'
import { fetchAndCache, fetchAndCacheList } from '/src/lib/fetchAndCache.mjs'

// state backed in SessionStorage
const initialState = () => ({
   userCache: {},
   userStatus: {},
   userListStatus: {},
})

const { data: userState } = useIDBKeyval('user-state', initialState(), { mergeDefaults: true })

export const resetUseUser = () => {
   userState.value = initialState()
}


app.service('user').on('create', user => {
   if (!userState.value) return
   console.log('USER EVENT created', user)
   userState.value.userCache[user.id] = user
   userState.value.userStatus[user.id] = 'ready'
})

app.service('user').on('update', user => {
   if (!userState.value) return
   console.log('USER EVENT update', user)
   userState.value.userCache[user.id] = user
   userState.value.userStatus[user.id] = 'ready'
})

app.service('user').on('delete', user => {
   if (!userState.value) return
   console.log('USER EVENT delete', user)
   delete userState.value.userCache[user.id]
   delete userState.value.userStatus[user.id]
})

export function getFullname(user) {
   console.log('user', user)
   return "azer"
   if (user.firstname && user.lastname) return user.firstname + ' ' + user.lastname
   return user.firstname || user.lastname
}

export const getUser = async (id) => {
   const { value, promise } = fetchAndCache(id, app.service('user'), userState?.value.userStatus, userState?.value.userCache)
   return value || await promise
}

export const userOfId = computed(() => (id) => {
   const { value } = fetchAndCache(id, app.service('user'), userState?.value.userStatus, userState?.value.userCache)
   return value
})

export const createUser = async (data) => {
   const user = await app.service('user').create({ data })
   // update cache
   userState.value.userCache[user.id] = user
   userState.value.userStatus[user.id] = 'ready'
   return user
}

export const updateUser = async (id, data) => {
   const user = await app.service('user').update({
      where: { id },
      data,
   })
   // update cache
   userState.value.userCache[id] = user
   userState.value.userStatus[id] = 'ready'
   return user
}

export const removeUser = async (id) => {
   await app.service('user').delete({ where: { id }})
   delete userState.value.userCache[id]
   delete userState.value.userStatus[id]
}

export const listOfUser = computed(() => {
   const { value } = fetchAndCacheList(app.service('user'), {}, ()=>true, userState?.value.userStatus, userState?.value.userCache, userState?.value.userListStatus)
   return value
})
