
export default function(app) {

    app.service('user').publish(async (context) => {
        return context.methodName.startsWith('find') ? [] : ['authenticated']
    })

    app.service('group').publish(async (context) => {
        return context.methodName.startsWith('find') ? [] : ['authenticated']
    })

    app.service('user_group').publish(async (context) => {
        return context.methodName.startsWith('find') ? [] : ['authenticated']
    })

}
