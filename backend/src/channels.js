import { eq, and } from 'drizzle-orm'
import * as schema from './db/schema.js'

// channels: 'students', 'teachers', ...'<student_uid>'

export default function(app) {

   function resultValue(context) {
      return Array.isArray(context.result) ? context.result[0] : context.result
   }

   async function isTeacher(context) {
      const db = context.app.get('db')
      const rows = await db.select().from(schema.user_tab_relation)
         .where(and(
            eq(schema.user_tab_relation.user_uid, context.socket.data.user.uid),
            eq(schema.user_tab_relation.tab, 'followup')
         ))
      return rows.length > 0
   }

   async function ownerUid(context) {
      const value = resultValue(context)
      if (!value) return null

      if (value.user_uid) return value.user_uid
      if (context.serviceName === 'user' && value.uid) return value.uid

      if (context.serviceName === 'user_document_event' && value.document_uid) {
         const db = context.app.get('db')
         const rows = await db.select().from(schema.user_document)
            .where(eq(schema.user_document.uid, value.document_uid))
            .limit(1)
         return rows[0]?.user_uid ?? null
      }

      return null
   }

   async function roomsToPublish(context) {
      if (context.methodName.startsWith('find')) return []
      const teacher = await isTeacher(context)
      if (teacher) {
         const uid = await ownerUid(context)
         return uid ? ['teachers', uid] : ['teachers', 'students']
      } else {
         return [context.socket.data.user.uid, 'teachers']
      }
   }

   app.service('user').publish(async (context) => roomsToPublish(context))
   app.service('group').publish(async (context) => roomsToPublish(context))
   app.service('group_slot').publish(async (context) => roomsToPublish(context))
   app.service('user_tab_relation').publish(async (context) => roomsToPublish(context))
   app.service('user_group_relation').publish(async (context) => roomsToPublish(context))
   app.service('user_document').publish(async (context) => roomsToPublish(context))
   app.service('user_document_event').publish(async (context) => roomsToPublish(context))
   app.service('user_slot_excuse').publish(async (context) => roomsToPublish(context))
   app.service('test').publish(async (context) => roomsToPublish(context))
   app.service('groupslot_test_relation').publish(async (context) => roomsToPublish(context))
   app.service('user_test_relation').publish(async (context) => roomsToPublish(context))
}
