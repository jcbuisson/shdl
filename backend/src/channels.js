
export default function(app) {

    app.service('user').publish(async (context) => {
        return context.methodName.startsWith('find') ? [] : ['authenticated']
    })

    app.service('group').publish(async (context) => {
        return context.methodName.startsWith('find') ? [] : ['authenticated']
    })

    app.service('group_slot').publish(async (context) => {
        return context.methodName.startsWith('find') ? [] : ['authenticated']
    })

    app.service('user_tab_relation').publish(async (context) => {
        return context.methodName.startsWith('find') ? [] : ['authenticated']
    })

    app.service('user_group_relation').publish(async (context) => {
        return context.methodName.startsWith('find') ? [] : ['authenticated']
    })

    app.service('user_document').publish(async (context) => {
        return context.methodName.startsWith('find') ? [] : ['authenticated']
    })

    app.service('user_document_event').publish(async (context) => {
        return context.methodName.startsWith('find') ? [] : ['authenticated']
    })

}
