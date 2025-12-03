
// channels : 'students', 'teachers', ...'<student_uid>'

export default function(app) {

   async function isTeacher() {
      const prisma = context.app.get('prisma')
      const followupRelations = await prisma.user_tab_relation.findMany({ where: { user_uid: context.socket.data.user.uid, tab: 'followup' } })
      return followupRelations.length > 0
   }

   async function roomsToPublish(context) {
      // 'find' events are not sent to anyone
      if (context.methodName.startsWith('find')) return []
      if (isTeacher()) {
         // the events of a teacher are sent to all teachers and all students
         return ['teachers', 'students']
      } else {
         // the events of a student are sent to himself (room: <uid>) and all teachers
         return [context.socket.data.user.uid, 'teachers']
      }
   }

   app.service('user').publish(async (context) => {
      return await roomsToPublish(context)
   })

   app.service('group').publish(async (context) => {
      return await roomsToPublish(context)
   })

   app.service('group_slot').publish(async (context) => {
      return await roomsToPublish(context)
   })

   app.service('user_tab_relation').publish(async (context) => {
      return await roomsToPublish(context)
   })

   app.service('user_group_relation').publish(async (context) => {
      return await roomsToPublish(context)
   })

   app.service('user_document').publish(async (context) => {
      return await roomsToPublish(context)
   })

   app.service('user_document_event').publish(async (context) => {
      return await roomsToPublish(context)
   })

   app.service('user_slot_excuse').publish(async (context) => {
      return await roomsToPublish(context)
   })

   app.service('shdl_test').publish(async (context) => {
      return await roomsToPublish(context)
   })

   app.service('groupslot_shdltest_relation').publish(async (context) => {
      return await roomsToPublish(context)
   })

   app.service('user_shdltest_relation').publish(async (context) => {
      return await roomsToPublish(context)
   })

}
