import { expressX } from '@jcbuisson/express-x'

import inquirer from 'inquirer'
import bcrypt from 'bcryptjs'
import { v7 as uuidv7 } from 'uuid'

import config from '#config'
import { createDB } from '#root/src/db/index.js'
import services from '#root/src/services/index.js'


async function main() {
   try {
      const app = expressX(config)
      const db = createDB(config.DATABASE_URL)
      app.set('db', db)
      app.configure(services)

      const answers = await inquirer.prompt([
         {
            name: 'email',
            type: 'email',
            message: 'Enter email',
         },
         {
            name: 'firstname',
            type: 'string',
            message: 'Enter firstname',
         },
         {
            name: 'lastname',
            type: 'string',
            message: 'Enter lastname',
         },
         {
            name: 'password',
            type: 'password',
            message: 'Enter password',
         },
         {
            name: 'repeat',
            type: 'password',
            message: 'Repeat password',
         },
      ])
      if (answers.password !== answers.repeat) {
         throw new Error("passwords do not match")
      }
      const uid = uuidv7()
      const now = new Date()
      const [user] = await app.service('user').createWithMeta(uid, {
         email: answers.email,
         firstname: answers.firstname,
         lastname: answers.lastname,
         password: await bcrypt.hash(answers.password, 5),
      }, now)
      const tabUid = uuidv7()
      await app.service('user_tab_relation').createWithMeta(tabUid, {
         user_uid: user.uid,
         tab: 'users',
      }, now)

   } catch(err) {
      console.error(err.toString())
   } finally {
      process.exit(0)
   }
}

main()
