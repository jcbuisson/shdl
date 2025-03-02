
import hooks from './group.hooks.js'


export default function (app) {

   app.createService('group', app.get('prisma').group)
   app.service('group').hooks(hooks)

}
