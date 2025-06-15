
import hooks from './user_slot_excuse.hooks.js'


export default function (app) {

   const prisma = app.get('prisma')

   app.createService('user_slot_excuse', {

      findUnique: prisma.user_slot_excuse.findUnique,

      findMany: prisma.user_slot_excuse.findMany,
      
      createWithMeta: async (uid, data, created_at) => {
         const [value, meta] = await prisma.$transaction([
            prisma.user_slot_excuse.create({ data: { uid, ...data } }),
            prisma.metadata.create({ data: { uid, created_at } })
         ])
         return [value, meta]
      },
      
      updateWithMeta: async (uid, data, updated_at) => {
         const [value, meta] = await prisma.$transaction([
            prisma.user_slot_excuse.update({ where: { uid }, data }),
            prisma.metadata.update({ where: { uid }, data: { updated_at } })
         ])
         return [value, meta]
      },
      
      deleteWithMeta: async (uid, deleted_at) => {
         const [value, meta] = await prisma.$transaction([
            prisma.user_slot_excuse.delete({ where: { uid } }),
            prisma.metadata.update({ where: { uid }, data: { deleted_at } })
         ])
         return [value, meta]
      },
   })

   app.service('user_slot_excuse').hooks(hooks)
}
