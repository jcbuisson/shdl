
import { PrismaClient } from '@prisma/client'
import { expressX } from '@jcbuisson/express-x'

import inquirer from 'inquirer'
import bcrypt from 'bcryptjs'
import { uid as uid16 } from 'uid'

import config from '#config'
import services from '#root/src/services/index.js'


async function main() {
   try {
      const app = expressX(config)
      const prisma = new PrismaClient()
      app.set('prisma', prisma)
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
      // check password match
      if (answers.password !== answers.repeat) {
         throw new Error("passwords do not match")
      }
      // create user
      let uid = uid16(16)
      const now = new Date()
      const [user, _] = await app.service('user').createWithMeta(uid, {
         email: answers.email,
         firstname: answers.firstname,
         lastname: answers.lastname,
         password: await bcrypt.hash(answers.password, 5),
      }, now)
      // create relation with 'users' (user management) tab
      uid = uid16(16)
      await app.service('user_tab_relation').createWithMeta(uid, {
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
