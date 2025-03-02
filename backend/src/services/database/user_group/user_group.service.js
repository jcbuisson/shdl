
import hooks from './user_group.hooks.js'


export default function (app) {

   app.createService('user_group', app.get('prisma').user_group)
   app.service('user_group').hooks(hooks)

}
