
export default function(app) {

    app.service('user').publish(async (context) => {
        return context.methodName.startsWith('find') ? [] : ['authenticated']
    })

}
