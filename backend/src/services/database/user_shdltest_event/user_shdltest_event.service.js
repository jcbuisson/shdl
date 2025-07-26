
import hooks from './user_shdltest_event.hooks.js'

export default function (app) {

   const prisma = app.get('prisma')

   app.createService('user_shdltest_event', {

      findUnique: prisma.user_shdltest_event.findUnique,

      findMany: prisma.user_shdltest_event.findMany,
      
      createWithMeta: async (uid, data, created_at) => {
         const [value, meta] = await prisma.$transaction([
            prisma.user_shdltest_event.create({ data: { uid, ...data } }),
            prisma.metadata.create({ data: { uid, created_at } })
         ])
         return [value, meta]
      },
      
      updateWithMeta: async (uid, data, updated_at) => {
         const [value, meta] = await prisma.$transaction([
            prisma.user_shdltest_event.update({ where: { uid }, data }),
            prisma.metadata.update({ where: { uid }, data: { updated_at } })
         ])
         return [value, meta]
      },
      
      deleteWithMeta: async (uid, deleted_at) => {
         const [value, meta] = await prisma.$transaction([
            prisma.user_shdltest_event.delete({ where: { uid } }),
            prisma.metadata.update({ where: { uid }, data: { deleted_at } })
         ])
         return [value, meta]
      },
   })

   app.service('user_shdltest_event').hooks(hooks)
}
