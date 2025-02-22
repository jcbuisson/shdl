
// COMMON TO NUTRIEDUC & INFIRMIER

import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

import hooks from './auth.hooks.js'
import config from '#config'

import { EXError } from '#root/src/common-server.mjs'


export default function (app) {

   const prisma = app.get('prisma')

   app.createService('auth', {

      signin: async (email, password) => {
         const prisma = app.get('prisma')
         // check existence of a user with `email`
         const user = await prisma.user.findUnique({ where: { email }})
         if (!user) throw new EXError('wrong-credentials')
         // check its password
         const correct = await bcrypt.compare(password, user.password)
         if (!correct) throw new EXError('wrong-credentials')
         return user
      },

      signup: async (email, firstname, lastname) => {
         // check existence of a user with `email`
         const user = await prisma.user.findUnique({ where: { email }})
         // send email
         if (user) {
            await app.service('mail').send({
               from: 'buisson@enseeiht.fr',
               to: email,
               subject: "Problème création compte SHDL",
               text: `Un compte associé à l'email '${email}' existe déjà, sous le nom : ${firstname} ${lastname}. Cliquez sur "Mot de passe oublié" pour le réactiver, ou utilisez une autre adresse mail.`,
            })
         } else {
            const createdUser = await prisma.user.create({
               data: { email, firstname, lastname }
            })
            const token = jwt.sign({ userid: createdUser.id }, config.JWT_PRIVATE_KEY, {
               algorithm: "RS256",
               expiresIn: "1h",
             })
            await app.service('mail').send({
               from: 'buisson@enseeiht.fr',
               to: email,
               subject: "Création compte SHDL",
               text: `Bonjour ${firstname} ${lastname}. Cliquez <a href="${config.CLIENT_URL}/set-password/${token}">sur ce lien</a> pour confirmer votre inscription`,
            })
         }
      },

      // see hooks
      logout: async () => {
         return 'ok'
      },

      getAllAuthenticatedUsers: async () => {
         const sockets = await app.io.fetchSockets()
         return sockets
            .filter(socket => !!socket.data.user)
            .map(socket => socket.data.user.id)
      },

      getNameFromSub: async (subField, sub) => {
         const prisma = app.get('prisma')
         const user = await prisma.user.findUnique({ where: { [subField]: sub }})
         if (!user) return null
         if (!user.firstname && !user.lastname) return ''
         if (!user.firstname) return user.lastname
         if (!user.lastname) return user.firstname
         return user.lastname + ' ' + user.firstname
      },

      getPasswordStatusFromSub: async (subField, sub) => {
         const prisma = app.get('prisma')
         const user = await prisma.user.findUnique({ where: { [subField]: sub }})
         if (user === null) return "invalid"
         return user.password ? "password" : "nopassword"
      },

      setPassword: async (subField, sub, password) => {
         const prisma = app.get('prisma')
         password = await bcrypt.hash(password, 5)
         const user = await prisma.user.update({
            where: { [subField]: sub },
            data: { password }
         })
         return user.id
      },

      setPasswordWithToken: async (token, password) => {
         try {
            const payload = jwt.verify(token, config.SECRET)
            password = await bcrypt.hash(password, 5)
            const user = await prisma.user.update({
               where: { id: payload.userid },
               data: {
                  accept_cgu: true,
                  password
               },
            })
            delete user.password
            return user
         } catch(err) {
            if (err.code === 'jwt-error') {
               throw new EXError('jwt-error', "Could not verify JWT")
            } else {
               throw new EXError('unknown-error', err.message)
            }
         }
      },

      // only when sub is email
      forgottenPassword: async (email) => {
         console.log('forgottenPassword', email)
         // check existence of a user with `email`
         const user = await prisma.user.findUnique({ where: { email }})
         if (!user) return
         // send reset password email
         const token = jwt.sign({ userid: user.id }, config.SECRET)
         await app.service('mail').send({
            from: 'buisson@enseeiht.fr',
            to: email,
            subject: "Journal de bord Infirmier, réinitialisation du mot de passe",
            text: `Cliquez <a href="${config.CLIENT_URL}/set-password/${token}">sur ce lien</a> pour réinitialiser votre mot de passe`,
         })
      },

      // Do nothing - see hooks
      checkAndExtend: async () => {
      },
   })

   app.service('auth').hooks(hooks)
}
