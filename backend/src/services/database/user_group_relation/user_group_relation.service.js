
import hooks from './user_group_relation.hooks.js'


export default function (app) {

   app.createService('user_group_relation', app.get('prisma').user_group_relation)
   app.service('user_group_relation').hooks(hooks)

}
