
export default function (app) {

   app.createService('sync', {

      go: async (modelName, where, cutoffDate, clientValuesDict) => {

         const databaseService = app.service(modelName)
   
         // STEP 1: get existing database `where` values
         const databaseValues = await databaseService.findMany({ where })
      
         const databaseValuesDict = databaseValues.reduce((accu, value) => {
            accu[value.uid] = value
            return accu
         }, {})
         console.log('clientValuesDict', clientValuesDict)
         console.log('databaseValuesDict', databaseValuesDict)
      
         // STEP 2: compute intersections between client and database uids
         const onlyDatabaseIds = new Set()
         const onlyClientIds = new Set()
         const databaseAndClientIds = new Set()
      
         for (const uid in databaseValuesDict) {
            if (uid in clientValuesDict) {
               databaseAndClientIds.add(uid)
            } else {
               onlyDatabaseIds.add(uid)
            }
         }
      
         for (const uid in clientValuesDict) {
            if (uid in databaseValuesDict) {
               databaseAndClientIds.add(uid)
            } else {
               onlyClientIds.add(uid)
            }
         }
         console.log('onlyDatabaseIds', onlyDatabaseIds)
         console.log('onlyClientIds', onlyClientIds)
         console.log('databaseAndClientIds', databaseAndClientIds)
      
         // STEP 3: build add/update/delete sets
         const addDatabase = []
         const updateDatabase = []
         const deleteDatabase = []
      
         const addClient = []
         const updateClient = []
         const deleteClient = []
      
         for (const uid of onlyDatabaseIds) {
            const databaseValue = databaseValuesDict[uid]
            addClient.push(databaseValue)
         }
      
         for (const uid of onlyClientIds) {
            const clientValue = clientValuesDict[uid]
            if (clientValue.deleted_) continue
            if (new Date(clientValue.createdAt) > cutoffDate) {
               addDatabase.push(clientValue)
            } else {
               deleteClient.push(uid)
            }
         }
      
         for (const uid of databaseAndClientIds) {
            const databaseValue = databaseValuesDict[uid]
            const clientValue = clientValuesDict[uid]
            if (clientValue.deleted_) {
               deleteDatabase.push(uid)
               deleteClient.push(uid) // also ask the client to remove the record with deleted_=true
            } else {
               const dateDifference = new Date(clientValue.updatedAt) - databaseValue.updatedAt
               if (dateDifference > 0) {
                  updateDatabase.push(clientValue)
               } else if (dateDifference < 0) {
                  updateClient.push(databaseValue)
               }
            }
         }
         console.log('addDatabase', addDatabase)
         console.log('deleteDatabase', deleteDatabase)
         console.log('updateDatabase', updateDatabase)
      
         console.log('addClient', addClient)
         console.log('deleteClient', deleteClient)
         console.log('updateClient', updateClient)
      
         // STEP4: execute database changes and publish related events for connected clients
         for (const data of addDatabase) {
            await databaseService.create({ data })
         }
         for (const data of updateDatabase) {
            await databaseService.update({
               where: { uid: data.uid },
               data: { name: data.name }
            })
         }
         for (const uid of deleteDatabase) {
            await databaseService.delete({ where: { uid } })
         }
      
         // STEP5: return to client changes to perform on its cache
         return {
            toAdd: addClient,
            toUpdate: updateClient,
            toDelete: deleteClient,
         }
      },
   })

}
