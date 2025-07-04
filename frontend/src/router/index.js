
import { createRouter, createWebHistory } from 'vue-router'

import { extendExpiration } from "/src/use/useAuthentication"
import { useUserTabRelation } from '/src/use/useUserTabRelation'
import { useUserDocument } from '/src/use/useUserDocument'

const { findWhere: findUserTabRelations } = useUserTabRelation()
const { findByUID: findUserDocumentByUID } = useUserDocument()


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
      meta: {
         requiresAuth: true,
      },
      props: true,
      component: () => import('/src/views/Home.vue'),
      children: [
         {
            path: 'users',
            meta: {
               roles: ['users']
            },
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
            meta: {
               roles: ['groups']
            },
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
            meta: {
               roles: ['workshop'],
            },
            props: true,
            component: () => import('/src/views/workshop/Workshop.vue'),
            children: [
               {
                  path: ':document_uid',
                  meta: {
                     checks: ['same_document_user'],
                  },
                  props: true,
                  component: () => import('/src/views/workshop/ManageDocument.vue'),
                  children: [
                     {
                        path: 'edit',
                        props: true,
                        component: () => import('/src/components/EditDocument.vue'),
                     },
                     {
                        path: 'simulate',
                        props: true,
                        component: () => import('/src/views/workshop/SHDLSimulator.vue'),
                     },
                  ],      
               },
            ],      
         },
         {
            path: 'followup',
            meta: {
               roles: ['followup']
            },
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
                                    component: () => import('/src/views/workshop/SHDLSimulator.vue'),
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
            meta: {
               roles: ['tests']
            },
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
         // extend session at each route change
         extendExpiration()
      } catch(err) {
         console.log('router.beforeEach err', err.code, err.message)
         // restartApp()
      }
   }

   if (to.meta.roles) {
      // check that signed-in user has tabs corresponding to roles
      const relations = await findUserTabRelations({ user_uid: to.params.signedinUid })
      const tabs = relations.map(relation => relation.tab)
      if (to.meta.roles.some(role => !tabs.includes(role))) {
         next('/')
      }
   }

   if (to.meta.checks) {
      for (const check of to.meta.checks) {
         if (check === 'same_document_user') {
            // check that document's owner is signed-in user
            // document is necessarily in cache since it is visible in the document list of ManageDocument.vue
            const userDocument = await findUserDocumentByUID(to.params.document_uid)
            if (userDocument.user_uid !== to.params.signedinUid) {
               next('/')
            }
         }
      }
   }

   next()
})

export default router
