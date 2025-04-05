
import { createRouter, createWebHistory } from 'vue-router'

import { extendExpiration } from "/src/use/useAuthentication"


const routes = [
   {
      path: '/login',
      component: () => import('/src/views/login/Login.vue'),
   },
   {
      path: '/create-account/:token',
      props: true,
      component: () => import('/src/views/login/CreateAccount.vue'),
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
      path: '/home/:signedinUid',
      props: true,
      component: () => import('/src/views/Home.vue'),
      children: [
         {
            path: 'users',
            props: true,
            component: () => import('/src/views/ManageUsers.vue'),
            children: [
               {
                  path: 'create',
                  props: true,
                  component: () => import('/src/views/CreateUser.vue'),
               },
               {
                  path: ':user_uid',
                  props: true,
                  component: () => import('/src/views/EditUser.vue'),
               },
            ],      
         },
         {
            path: 'groups',
            props: true,
            component: () => import('/src/views/ManageGroups.vue'),
            children: [
               {
                  path: 'create',
                  props: true,
                  component: () => import('/src/views/CreateGroup.vue'),
               },
               {
                  path: ':group_uid',
                  props: true,
                  component: () => import('/src/views/EditGroup.vue'),
               },
            ],      
         },
         {
            path: 'followup',
            props: true,
            component: () => import('/src/views/ManageStudents.vue'),
         },
         {
            path: 'tests',
            props: true,
            component: () => import('/src/views/ManageTests.vue'),
         },
         {
            path: 'shdl',
            props: true,
            component: () => import('/src/views/SHDLSandbox.vue'),
         },
         {
            path: 'craps',
            props: true,
            component: () => import('/src/views/CRAPSSandbox.vue'),
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
         // extends session at each route change
         extendExpiration()
      } catch(err) {
         console.log('router.beforeEach err', err.code, err.message)
         // restartApp()
      }
   }

   next()
})

export default router
