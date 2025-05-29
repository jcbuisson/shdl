
import hooks from './user_document.hooks.js'


export default function (app) {

   const prisma = app.get('prisma')

   app.createService('user_document', {

      findUnique: prisma.user_document.findUnique,

      findMany: prisma.user_document.findMany,
      
      createWithMeta: async (uid, data, created_at) => {
         const [value, meta] = await prisma.$transaction([
            prisma.user_document.create({ data: { uid, ...data } }),
            prisma.metadata.create({ data: { uid, created_at } })
         ])
         return [value, meta]
      },
      
      updateWithMeta: async (uid, data, updated_at) => {
         const [value, meta] = await prisma.$transaction([
            prisma.user_document.update({ where: { uid }, data }),
            prisma.metadata.update({ where: { uid }, data: { updated_at } })
         ])
         return [value, meta]
      },
      
      deleteWithMeta: async (uid, deleted_at) => {
         const [value, meta] = await prisma.$transaction([
            prisma.user_document.delete({ where: { uid } }),
            prisma.metadata.update({ where: { uid }, data: { deleted_at } })
         ])
         return [value, meta]
      },
   })

   app.service('user_document').hooks(hooks)
}
