
import { createRouter, createWebHistory } from 'vue-router'

import { app } from '/src/client-app.js'


const routes = [
   {
      path: '/login',
      component: () => import('/src/views/login/Login.vue'),
   },
   {
      path: '/set-password/:token',
      props: true,
      component: () => import('/src/views/login/SetPassword.vue'),
   },
   {
      path: '/forgotten-password',
      component: () => import('/src/views/login/ForgottenPassword.vue'),
   },

   {
      path: '/home/:userid',
      props: true,
      component: () => import('/src/views/Home.vue'),
      children: [
         {
            path: 'users',
            props: true,
            component: () => import('/src/views/ManageUsers.vue'),
         },
      ],
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
