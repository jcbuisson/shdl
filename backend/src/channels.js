import { eq, and } from 'drizzle-orm'
import * as schema from './db/schema.js'

// channels: 'students', 'teachers', ...'<student_uid>'

export default function(app) {

   async function isTeacher(context) {
      const db = context.app.get('db')
      const rows = await db.select().from(schema.user_tab_relation)
         .where(and(
            eq(schema.user_tab_relation.user_uid, context.socket.data.user.uid),
            eq(schema.user_tab_relation.tab, 'followup')
         ))
      return rows.length > 0
   }

   async function roomsToPublish(context) {
      if (context.methodName.startsWith('find')) return []
      const teacher = await isTeacher(context)
      if (teacher) {
         if (context.serviceName === 'user_document_event') {
            return []
         } else {
            return ['teachers', 'students']
         }
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
   app.service('shdl_test').publish(async (context) => roomsToPublish(context))
   app.service('groupslot_shdltest_relation').publish(async (context) => roomsToPublish(context))
   app.service('user_shdltest_relation').publish(async (context) => roomsToPublish(context))
}
