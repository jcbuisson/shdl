
import hooks from './user_tab_relation.hooks.js'


export default function (app) {

   app.createService('user_tab_relation', app.get('prisma').user_group)
   app.service('user_tab_relation').hooks(hooks)

}
