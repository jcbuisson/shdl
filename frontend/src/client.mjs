
function generateUID(length) {
   const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
   let uid = ''

   for (let i = 0; i < length; i++) {
     const randomIndex = Math.floor(Math.random() * characters.length)
     uid += characters.charAt(randomIndex)
   }
   return uid
}


export default function expressXClient(socket, options={}) {
   if (options.debug === undefined) options.debug = false

   const waitingPromisesByUid = {}
   const action2service2handlers = {}
   const type2appHandler = {}
   let connectListeners = []
   let disconnectListeners = []
   let errorListeners = []

   socket.on("connect", async () => {
      console.log("socket connected", socket.id)
      for (const func of connectListeners) {
         func(socket)
      }
   })

   socket.on("connect_error", async (err) => {
      console.log("socket connection error", socket.id)
      for (const func of errorListeners) {
         func(socket)
      }
   })

   socket.on("disconnect", async () => {
      console.log("socket disconnected", socket.id)
      for (const func of disconnectListeners) {
         func(socket)
      }
   })

   function addConnectListener(func) {
      connectListeners.push(func)
   }
   function removeConnectListener(func) {
      connectListeners = connectListeners.filter(f !== func)
   }

   function addDisconnectListener(func) {
      disconnectListeners.push(func)
   }
   function removeDisonnectListener(func) {
      disconnectListeners = disconnectListeners.filter(f !== func)
   }

   function addErrorListener(func) {
      errorListeners.push(func)
   }
   function removeErrorListener(func) {
      errorListeners = errorListeners.filter(f !== func)
   }

   // on receiving response from service request
   socket.on('client-response', ({ uid, error, result }) => {
      if (options.debug) console.log('client-response', uid, error, result)
      if (!waitingPromisesByUid[uid]) return // may not exist because a timeout removed it
      const [resolve, reject] = waitingPromisesByUid[uid]
      if (error) {
         reject(error)
      } else {
         resolve(result)
      }
      delete waitingPromisesByUid[uid]
   })

   // on receiving service events from pub/sub
   socket.on('service-event', ({ name, action, result }) => {
      if (options.debug) console.log('service-event', name, action, result)
      if (!action2service2handlers[action]) action2service2handlers[action] = {}
      const serviceHandlers = action2service2handlers[action]
      const handler = serviceHandlers[name]
      if (handler) handler(result)
   })
   
   async function serviceMethodRequest(name, action, serviceOptions, ...args) {
      // create a promise which will resolve or reject by an event 'client-response'
      const uid = generateUID(20)
      const promise = new Promise((resolve, reject) => {
         waitingPromisesByUid[uid] = [resolve, reject]
         // a timeout may also reject the promise
         if (serviceOptions.timeout && !serviceOptions.volatile) {
            setTimeout(() => {
               delete waitingPromisesByUid[uid]
               reject(`Error: timeout on service '${name}', action '${action}', args: ${JSON.stringify(args)}`)
            }, serviceOptions.timeout)
         }
      })
      // send request to server through websocket
      if (options.debug) console.log('client-request', uid, name, action, args)
      if (serviceOptions.volatile) {
         // event is not sent if connection is not active
         socket.volatile.emit('client-request', { uid, name, action, args, })
      } else {
         // event is buffered if connection is not active (default)
         socket.emit('client-request', { uid, name, action, args, })
      }
      return promise
   }

   function service(name, serviceOptions={}) {
      if (serviceOptions.timeout === undefined) serviceOptions.timeout = 20000
      const service = {
         // associate a handler to a pub/sub event for this service
         on: (action, handler) => {
            if (!action2service2handlers[action]) action2service2handlers[action] = {}
            const serviceHandlers = action2service2handlers[action]
            serviceHandlers[name] = handler
         },
      }
      // use a Proxy to allow for any method name for a service
      const handler = {
         get(service, action) {
            if (!(action in service)) {
               // newly used property `action`: define it as a service method request function
               service[action] = (...args) => serviceMethodRequest(name, action, serviceOptions, ...args)
            }
            return service[action]
         }
      }
      return new Proxy(service, handler)
   }

   ///////////////         APPLICATION-LEVEL EVENTS         /////////////////

   // There is a need for application-wide events sent outside any service method call, for example when backend state changes
   // without front-end interactions
   socket.on('app-event', ({ type, value }) => {
      if (options.debug) console.log('app-event', type, value)
      if (!type2appHandler[type]) type2appHandler[type] = {}
      const handler = type2appHandler[type]
      // console.log('handler', handler)
      if (handler) handler(value)
   })

   // add a handler for application-wide events
   function on(type, handler) {
      type2appHandler[type] = handler
      // console.log('type2appHandler[type]', type2appHandler[type])
   }

   return {
      addConnectListener,
      removeConnectListener,
      addDisconnectListener,
      removeDisonnectListener,
      addErrorListener,
      removeErrorListener,
   
      service,
      on,
   }
}
