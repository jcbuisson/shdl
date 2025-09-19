
export default function(app) {

   async function roomsToPublish(context) {
      if (context.methodName.startsWith('find')) return []
      return [context.socket.id, 'teachers']
      
      // const prisma = context.app.get('prisma')
      // const followupRelations = await prisma.user_tab_relation.findMany({ where: { user_uid: context.socket.data.user.uid, tab: 'followup' } })
      // const isTeacher = (followupRelations.length > 0)
      // return isTeacher ? ['teachers'] : [context.socket.id, 'teachers'] : [context.socket.id]
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
