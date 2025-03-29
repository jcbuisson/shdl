
export default function (app) {

   app.createService('sync', {

      go: async (modelName, where, cutoffDate, clientMetadataDict) => {
         console.log('>>>>> SYNC', modelName, where, cutoffDate)
         const databaseService = app.service(modelName)
   
         // STEP 1: get existing database `where` values
         const databaseValues = await databaseService.findMany({ where })
      
         const databaseValuesDict = databaseValues.reduce((accu, value) => {
            accu[value.uid] = value
            return accu
         }, {})
         console.log('clientMetadataDict', clientMetadataDict)
         console.log('databaseValuesDict', databaseValuesDict)
      
         // STEP 2: compute intersections between client and database uids
         const onlyDatabaseIds = new Set()
         const onlyClientIds = new Set()
         const databaseAndClientIds = new Set()
      
         for (const uid in databaseValuesDict) {
            if (uid in clientMetadataDict) {
               databaseAndClientIds.add(uid)
            } else {
               onlyDatabaseIds.add(uid)
            }
         }
      
         for (const uid in clientMetadataDict) {
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
            const clientValue = clientMetadataDict[uid]
            if (clientValue.deleted_at) {
               deleteClient.push(uid)
            } else if (new Date(clientValue.created_at) > cutoffDate) {
               addDatabase.push(clientValue)
            } else {
               // deleteClient.push(uid)
            }
         }
      
         for (const uid of databaseAndClientIds) {
            const databaseValue = databaseValuesDict[uid]
            const clientValue = clientMetadataDict[uid]
            if (clientValue.deleted_at) {
               deleteDatabase.push(uid)
               deleteClient.push(uid) // also ask the client to remove the record with deleted_=true
            } else {
               const dateDifference = new Date(clientValue.updated_at) - databaseValue.updated_at
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
      
         // STEP4: execute database soft-deletions
         // database creations & updates are done later by the client with complete data (this function only has client values's meta-data)
         for (const uid of deleteDatabase) {
            await databaseService.update({
               where: { uid },
               data: { deleted_at: new Date() }
            })
         }
      
         // STEP5: return to client the changes to perform on its cache, and create/update to perform on database with full data
         return {
            toAdd: addClient,
            toUpdate: updateClient,
            toDelete: deleteClient,

            addDatabase,
            updateDatabase,
         }
      },
   })

}
