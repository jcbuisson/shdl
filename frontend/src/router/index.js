
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
            component: () => import('/src/views/users/ManageUsers.vue'),
            children: [
               {
                  path: 'create',
                  props: true,
                  component: () => import('/src/views/users/CreateUser.vue'),
               },
               {
                  path: ':user_uid',
                  props: true,
                  component: () => import('/src/views/users/EditUser.vue'),
               },
            ],      
         },
         {
            path: 'groups',
            props: true,
            component: () => import('/src/views/groups/ManageGroups.vue'),
            children: [
               {
                  path: 'create',
                  props: true,
                  component: () => import('/src/views/groups/CreateGroup.vue'),
               },
               {
                  path: ':group_uid',
                  props: true,
                  component: () => import('/src/views/groups/EditGroup.vue'),
               },
            ],      
         },
         {
            path: 'workshop',
            props: true,
            component: () => import('/src/views/workshop/Workshop.vue'),
            children: [
               {
                  path: ':document_uid',
                  props: true,
                  component: () => import('/src/views/workshop/ManageDocument.vue'),
                  children: [
                     {
                        path: 'edit',
                        props: true,
                        component: () => import('/src/components/EditDocument.vue'),
                        // component: () => import('/src/components/Dummy.vue'),
                     },
                     {
                        path: 'simulate',
                        props: true,
                        component: () => import('/src/components/SHDLSimulator.vue'),
                     },
                  ],      
               },
            ],      
         },
         {
            path: 'followup',
            props: true,
            component: () => import('/src/views/followup/ManageStudents.vue'),
            children: [
               {
                  path: ':user_uid',
                  props: true,
                  component: () => import('/src/views/followup/StudentFollowup.vue'),
                  children: [
                     {
                        path: 'activity',
                        props: true,
                        component: () => import('/src/views/followup/StudentActivity.vue'),
                     },
                     {
                        path: 'attendance',
                        props: true,
                        component: () => import('/src/views/followup/StudentAttendance.vue'),
                     },
                     {
                        path: 'workshop',
                        props: true,
                        component: () => import('/src/views/followup/StudentWorkshop.vue'),
                        children: [
                           {
                              path: ':document_uid',
                              props: true,
                              component: () => import('/src/views/followup/StudentDocument.vue'),
                              children: [
                                 {
                                    path: 'edit',
                                    props: route => ({
                                       document_uid: route.params.document_uid,
                                       editable: false,
                                    }),
                                    component: () => import('/src/components/EditDocument.vue'),
                                 },
                                 {
                                    path: 'simulate',
                                    props: true,
                                    component: () => import('/src/components/SHDLSimulator.vue'),
                                 },
                              ],      
                           },
                        ],
                     },
                     {
                        path: 'grade',
                        props: true,
                        component: () => import('/src/views/followup/StudentGrade.vue'),
                     },
                  ],      
               },
            ],      
         },
         {
            path: 'tests',
            props: true,
            component: () => import('/src/views/ManageTests.vue'),
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
