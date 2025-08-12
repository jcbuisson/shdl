
import path from 'path'
import fs from 'fs'
import { sync } from 'mkdirp'

import config from '#config'
import { EXError } from '#root/src/common-server.mjs'


export default function (app) {

   app.createService('file-upload', {

      // Upload a file chunk by chunk
      // At each call, `data.arrayBuffer` is appended at the end of the file
      async appendToFile(data) {
         console.log('data', data)
         try {
            const baseDir = config[data.dirKey]
            console.log('appendToFile baseDir', baseDir)
            const filePath = data.filePath
            const uploadPath = path.join(baseDir, filePath)
            console.log("uploadPath", uploadPath)
            sync(path.dirname(uploadPath))
            await fs.promises.appendFile(uploadPath, data.arrayBuffer)
         } catch(err) {
            console.log(err)
            throw new EXError('file-upload-error')
         }
      },

      // async resetFile(data) {
      //    try {
      //       const baseDir = config[data.dirKey]
      //       console.log('resetFile baseDir', baseDir)
      //       const filePath = data.filePath
      //       const uploadPath = path.join(baseDir, filePath)
      //       console.log("resetFile", uploadPath)
      //       sync(path.dirname(uploadPath))
      //       await fs.promises.writeFile(uploadPath, '')
      //    } catch(err) {
      //       console.log(err)
      //       throw new EXError('reset-file-error')
      //    }
      // },

      async deleteFile(dirKey, filePath) {
         try {
            const baseDir = config[dirKey]
            console.log('deleteFile baseDir', baseDir)
            const uploadPath = path.join(baseDir, filePath)
            console.log("deleteFile", uploadPath)
            sync(path.dirname(uploadPath))
            await fs.promises.rm(uploadPath)
         } catch(err) {
            console.log(err)
            throw new EXError('delete-file-error')
         }
      },
   })
}
