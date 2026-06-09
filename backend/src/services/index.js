import { drizzleOfflinePlugin } from '@jcbuisson/express-x-drizzle'
import { eq, and } from 'drizzle-orm'

import * as schema from '#root/src/db/schema.js'
import { isAuthenticated } from '#root/src/hooks.mjs'
import { protect } from '#root/src/common-server.mjs'

import authService from './custom/auth/auth.service.js'
import mailService from './custom/mail/mail.service.js'
import fileUploadService from './custom/file-upload/file-upload.service.mjs'


const commonHooks = {
   before: { all: [isAuthenticated] },
}

const userHooks = {
   before: { all: [isAuthenticated] },
   after:  { all: [protect('password')] },
}


export default function (app) {
   const db = app.get('db')

   // model services + sync service
   drizzleOfflinePlugin(app, db, schema.metadata, [
      schema.user,
      schema.group,
      schema.group_slot,
      schema.user_tab_relation,
      schema.user_group_relation,
      schema.user_document,
      schema.user_document_event,
      schema.user_slot_excuse,
      schema.test,
      schema.groupslot_test_relation,
      schema.user_test_relation,
   ])

   // metadata service (flat where, used by frontend rollback path)
   app.createService('metadata', {
      findUnique: async (where = {}) => {
         const conditions = Object.entries(where).map(([k, v]) => eq(schema.metadata[k], v))
         if (conditions.length === 0) return null
         const rows = await db.select().from(schema.metadata)
            .where(conditions.length === 1 ? conditions[0] : and(...conditions))
            .limit(1)
         return rows[0] ?? null
      },
      findMany: async (where = {}) => {
         const conditions = Object.entries(where).map(([k, v]) => eq(schema.metadata[k], v))
         if (conditions.length === 0) return db.select().from(schema.metadata)
         return db.select().from(schema.metadata)
            .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      },
   })

   // hooks
   app.service('user').hooks(userHooks)
   app.service('group').hooks(commonHooks)
   app.service('group_slot').hooks(commonHooks)
   app.service('user_tab_relation').hooks(commonHooks)
   app.service('user_group_relation').hooks(commonHooks)
   app.service('user_document').hooks(commonHooks)
   app.service('user_document_event').hooks(commonHooks)
   app.service('user_slot_excuse').hooks(commonHooks)
   app.service('test').hooks(commonHooks)
   app.service('groupslot_test_relation').hooks(commonHooks)
   app.service('user_test_relation').hooks(commonHooks)

   // custom services
   app.configure(authService)
   app.configure(mailService)
   app.configure(fileUploadService)
}
