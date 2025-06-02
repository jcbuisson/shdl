
import hooks from './user_document_event.hooks.js'


export default function (app) {

   const prisma = app.get('prisma')

   app.createService('user_document_event', prisma.user_document_event)

   app.service('user_document_event').hooks(hooks)
}
