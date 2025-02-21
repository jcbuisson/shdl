
// COMMON TO NUTRIEDUC & INFIRMIER

// socket.io connection data and pub/sub rooms are preserved on network disconnections/reconnections, but not on page refresh / reload
// (when a new page is loaded or the current page is refreshed, all resources from the previous page are closed and freed by the browser, including websockets)
// We want connection data and pub/sub rooms preserved after a page refresh / reload

import { roomCache, dataCache } from './transferData.mjs'


export default async function(app) {

   const io = app.get('io')

   app.addDisconnectingListener((socket, reason) => {
      console.log('onSocketDisconnecting', socket.id, reason)
      // save socket data & rooms in caches

      // on Google auth, there is a race between the google auth callback and the websocket disconnection
      // some data & rooms may already have been saved for socket.id by Google auth callback (see google-oauth2.middleware.js)
      const alreadySavedData = dataCache[socket.id]
      const alreadySavedRooms = roomCache[socket.id]

      dataCache[socket.id] = Object.assign({}, socket.data)
      roomCache[socket.id] = new Set(socket.rooms)

      if (alreadySavedData) dataCache[socket.id] = Object.assign(dataCache[socket.id], alreadySavedData)
      if (alreadySavedRooms) roomCache[socket.id].add(alreadySavedRooms)
   })

   app.addConnectListener((socket) => {
      console.log('onSocketConnect', socket.id)
   
      // when client ask for transfer from fromSocketId to toSocketId
      socket.on('cnx-transfer', async (fromSocketId, toSocketId) => {
         app.log('verbose', `cnx-transfer from ${fromSocketId} to ${toSocketId}`)
         console.log('dataCache', dataCache)
         console.log('roomCache', roomCache)
         // copy connection room & data from 'fromSocketId' to 'toSocketId'
         const toSocket = io.sockets.sockets.get(toSocketId)
         // data & rooms of fromSocketId are taken from dataCache and roomCache, since socket no longer exists
         const fromSocketRooms = roomCache[fromSocketId]
         if (toSocket && fromSocketRooms) {
            // copy rooms
            for (const room of fromSocketRooms) {
               if (room === fromSocketId) continue // do not include room associated to socket#id
               toSocket.join(room)
            }
            // copy data
            toSocket.data = dataCache[fromSocketId]
            // console.log('cnx-transfer data', toSocket.data)
            // console.log('cnx-transfer rooms', toSocket.rooms)
            // remove 'from' cache data
            delete roomCache[fromSocketId]
            delete dataCache[fromSocketId]
            // send acknowlegment to toSocket
            toSocket.emit('cnx-transfer-ack', fromSocketId, toSocketId)
         } else {
            console.log(`*** CNX TRANSFER ERROR, ${fromSocketId} -> ${toSocketId}`)
            toSocket.emit('cnx-transfer-error', fromSocketId, toSocketId)
         }
      })
   })
}
