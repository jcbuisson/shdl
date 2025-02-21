
import hooks from './user.hooks.js'


export default function (app) {

   app.createService('user', app.get('prisma').user)
   app.service('user').hooks(hooks)

}
