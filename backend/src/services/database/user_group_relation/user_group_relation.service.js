
import hooks from './user_group_relation.hooks.js'


export default function (app) {

   const prisma = app.get('prisma')

   app.createService('user_group_relation', {

      findUnique: prisma.user_group_relation.findUnique,

      findMany: prisma.user_group_relation.findMany,
      
      createWithMeta: async (uid, data, created_at) => {
         const [value, meta] = await prisma.$transaction([
            prisma.user_group_relation.create({ data: { uid, ...data } }),
            prisma.metadata.create({ data: { uid, created_at } })
         ])
         return [value, meta]
      },
      
      updateWithMeta: async (uid, data, updated_at) => {
         const [value, meta] = await prisma.$transaction([
            prisma.user_group_relation.update({ where: { uid }, data }),
            prisma.metadata.update({ where: { uid }, data: { updated_at } })
         ])
         return [value, meta]
      },
      
      deleteWithMeta: async (uid, deleted_at) => {
         const [value, meta] = await prisma.$transaction([
            prisma.user_group_relation.delete({ where: { uid } }),
            prisma.metadata.update({ where: { uid }, data: { deleted_at } })
         ])
         return [value, meta]
      },
   })

   app.service('user_group_relation').hooks(hooks)
}
