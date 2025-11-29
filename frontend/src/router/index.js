
import { createRouter, createWebHistory } from 'vue-router'

import useExpressXClient from '/src/use/useExpressXClient';

import { useAuthentication } from "/src/use/useAuthentication"
import { useUserTabRelation } from '/src/use/useUserTabRelation'
import { useUserDocument } from '/src/use/useUserDocument'

const { app } = useExpressXClient();
const { extendExpiration } = useAuthentication(app)

const { findWhere: findUserTabRelations } = useUserTabRelation(app)
const { findByUID: findUserDocumentByUID } = useUserDocument(app)


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
                  path: 'shdl/:document_uid',
                  meta: {
                     // check that document's owner is signed-in user
                     checks: ['same_document_user'],
                  },
                  props: true,
                  component: () => import('/src/views/workshop/ManageSHDLDocument.vue'),
                  children: [
                     {
                        path: '',
                        props: route => ({
                           signedinUid: route.params.signedinUid,
                           user_uid: route.params.signedinUid,
                           document_uid: route.params.document_uid,
                        }),
                        components: {
                           editor: () => import('/src/components/EditSHDLDocument.vue'),
                           simulator: () => import('/src/views/workshop/SHDLSimulator.vue'),
                        }
                     },
                  ],
               },
               {
                  path: 'text/:document_uid',
                  meta: {
                     // check that document's owner is signed-in user
                     checks: ['same_document_user'],
                  },
                  props: true,
                  component: () => import('/src/views/workshop/ManageTextDocument.vue'),
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
                        path: 'workshop',
                        props: true,
                        component: () => import('/src/views/followup/StudentWorkshop.vue'),
                        children: [
                           {
                              path: 'shdl/:document_uid',
                              props: true,
                              component: () => import('/src/views/workshop/ManageSHDLDocument.vue'),
                              children: [
                                 {
                                    path: '',
                                    props: route => ({
                                       signedinUid: route.params.signedinUid,
                                       user_uid: route.params.user_uid,
                                       document_uid: route.params.document_uid,
                                    }),
                                    components: {
                                       editor: () => import('/src/components/EditSHDLDocument.vue'),
                                       simulator: () => import('/src/views/workshop/SHDLSimulator.vue'),
                                    }
                                 },
                              ],     
                           },
                           {
                              path: 'text/:document_uid',
                              meta: {
                                 // check that document's owner is signed-in user
                                 //checks: ['same_document_user'],
                              },
                              props: true,
                              component: () => import('/src/views/workshop/ManageTextDocument.vue'),
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
            path: 'shdl_tests',
            meta: {
               roles: ['shdl_tests']
            },
            props: true,
            component: () => import('/src/views/shdl_tests/ManageSHDLTests.vue'),
            children: [
               {
                  path: 'create',
                  props: true,
                  component: () => import('/src/views/shdl_tests/CreateSHDLTest.vue'),
               },
               {
                  path: ':test_uid',
                  props: true,
                  component: () => import('/src/views/shdl_tests/EditSHDLTest.vue'),
               },
            ],      
         },
         {
            path: 'grade',
            meta: {
               roles: ['grade']
            },
            props: route => ({
               signedinUid: route.params.signedinUid,
               user_uid: route.params.signedinUid,
               editable: false,
            }),
            component: () => import('/src/views/followup/StudentGrade.vue'),
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
