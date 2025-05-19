
export default function (app) {

   const prisma = app.get('prisma')

   app.createService('metadata', {
      ...prisma.metadata
   })

}
