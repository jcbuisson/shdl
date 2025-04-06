
import { PrismaClient } from '@prisma/client'
import inquirer from 'inquirer'
import bcrypt from 'bcryptjs'
import { uid as uid16 } from 'uid'


async function main() {
   try {
      // create prisma client
      const prisma = new PrismaClient()

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
      const user = await prisma.user.create({
         data: {
            uid,
            email: answers.email,
            firstname: answers.firstname,
            lastname: answers.lastname,
            password: await bcrypt.hash(answers.password, 5),
         }
      })
      // create relation with 'users' (user management) tab
      uid = uid16(16)
      await prisma.user_tab_relation.create({
         data: {
            uid,
            user_uid: user.uid,
            tab: 'users',
         }
      })

   } catch(err) {
      console.error(err.toString())
   } finally {
      process.exit(0)
   }
}

main()
