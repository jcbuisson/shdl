
import { createRouter, createWebHistory } from 'vue-router'

import { app } from '/src/client-app.js'


const routes = [
   {
      path: '/login',
      name: 'login',
      component: () => import('/src/components/login/Login.vue'),
   },
   {
      path: '/set-password/:token',
      name: 'set-password',
      props: true,
      component: () => import('/src/components/login/SetPassword.vue'),
   },

   {
      path: "/:catchAll(.*)",
      redirect: '/login',
   },

]

const router = createRouter({
   history: createWebHistory(),
   routes
})


router.beforeEach(async (to, from, next) => {
   console.log('from', from.path, 'to', to.path)

   if (to.meta.requiresAuth) {
      try {
         // checks authentication + extends session at each route change
         await app.service('auth').checkAndExtend()
      } catch(err) {
         console.log('router.beforeEach err', err.code, err.message)
         // restartApp()
      }
   }

   next()
})

export default router
