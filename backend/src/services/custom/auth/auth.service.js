
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
         return user // returned value is replaced by { user, expiresAt } by 'after' hook
      },

      signup: async (email) => {
         // check existence of a user with `email`
         const user = await prisma.user.findUnique({ where: { email }})
         // send email
         if (user) {
            await app.service('mail').send({
               from: 'buisson@enseeiht.fr',
               to: email,
               subject: "Création compte SHDL",
               text: `<p>Bonjour,</p>
<p>Une demande de création de compte pour l'email ${email} vient d'être réalisée.</p>
<p><b>Ne faites rien si vous n'êtes pas à l'origine de cette demande.</b></p>
<p>Si par contre vous êtes bien l'auteur de cette demande, sachez qu'un compte associé à l'email '${email}' existe déjà.</p>`,
            })
         } else {
            const token = jwt.sign({ email }, config.JWT_PRIVATE_KEY, {
               algorithm: "RS256",
               // expiresIn: "1h",
            })
            await app.service('mail').send({
               from: 'buisson@enseeiht.fr',
               to: email,
               subject: "Création compte SHDL",
               text: `<p>Bonjour,</p>
<p>Une demande de création de compte pour l'email ${email} vient d'être réalisée.</p>
<p><b>Ne faites rien si vous n'êtes pas à l'origine de cette demande.</b></p>
<p>Si par contre vous êtes bien l'auteur de cette demande, cliquez <a href="${config.CLIENT_URL}/create-account/${token}">sur ce lien</a> pour confirmer votre inscription.</p>`,
            })
         }
      },

      // see hooks
      signout: async () => {
         return 'ok'
      },

      createAccountWithToken: async (token, password, firstname, lastname) => {
         try {
            const payload = jwt.verify(token, config.JWT_PRIVATE_KEY)
            password = await bcrypt.hash(password, 5)
            const user = await prisma.user.create({
               data: { email: payload.email, password, firstname, lastname }
            })
            return user
         } catch(err) {
            if (err.code === 'jwt-error') {
               throw new EXError('jwt-error', "Could not verify JWT")
            } else {
               throw new EXError('unknown-error', err.message)
            }
         }
      },

      setPasswordWithToken: async (token, password) => {
         try {
            const payload = jwt.verify(token, config.JWT_PRIVATE_KEY)
            password = await bcrypt.hash(password, 5)
            const user = await prisma.user.update({
               where: { id: payload.userid },
               data: {
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

      forgottenPassword: async (email) => {
         // check existence of a user with `email`
         const user = await prisma.user.findUnique({ where: { email }})
         if (!user) return
         // send reset password email
         const token = jwt.sign({ userid: user.id }, config.JWT_PRIVATE_KEY, {
            algorithm: "RS256",
            // expiresIn: "1h",
         })
         await app.service('mail').send({
            from: 'buisson@enseeiht.fr',
            to: email,
            subject: "SHDL, réinitialisation du mot de passe",
            text: `Cliquez <a href="${config.CLIENT_URL}/set-password/${token}">sur ce lien</a> pour réinitialiser votre mot de passe`,
         })
      },

      // Typically used each time a user interacts with the application
      // Sends a client socket event 'expiresAt' with the new expiration date, or null if client is no longer authenticated
      // See hooks
      extendExpiration: async () => {
      },
   })

   app.service('auth').hooks(hooks)
}
