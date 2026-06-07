import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { v7 as uuidv7 } from 'uuid'
import { eq } from 'drizzle-orm'

import hooks from './auth.hooks.js'
import config from '#config'
import { EXError } from '#root/src/common-server.mjs'
import * as schema from '#root/src/db/schema.js'


export default function (app) {

   app.createService('auth', {

      signin: async (email, password) => {
         const db = app.get('db')
         const rows = await db.select().from(schema.user).where(eq(schema.user.email, email)).limit(1)
         const user = rows[0] ?? null
         if (!user) throw new EXError('wrong-credentials')
         const correct = await bcrypt.compare(password, user.password)
         if (!correct) throw new EXError('wrong-credentials')
         return user // returned value is replaced by { user, expiresAt } by 'after' hook
      },

      signup: async (email) => {
         const db = app.get('db')
         const rows = await db.select().from(schema.user).where(eq(schema.user.email, email)).limit(1)
         const user = rows[0] ?? null
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
            })
            await app.service('mail').send({
               from: 'buisson@enseeiht.fr',
               to: email,
               subject: "Création compte SHDL",
               text: `<p>Bonjour,</p>
<p>Une demande de création de compte pour l'email ${email} vient d'être réalisée.</p>
<p><b>Ne faites rien si vous n'êtes pas à l'origine de cette demande.</b></p>
<p>Si par contre vous en êtes bien l'auteur, cliquez <a href="${config.CLIENT_URL}/create-account/${token}">sur ce lien</a> pour confirmer votre inscription.</p>`,
            })
         }
      },

      signout: async () => {
         return 'ok'
      },

      createAccountWithToken: async (token, password, firstname, lastname) => {
         try {
            const payload = jwt.verify(token, config.JWT_PRIVATE_KEY)
            password = await bcrypt.hash(password, 5)
            const uid = uuidv7()
            const data = { uid, email: payload.email, password, firstname, lastname }
            const created_at = new Date()
            const db = app.get('db')
            const [user] = await db.transaction(async (tx) => {
               const [u] = await tx.insert(schema.user).values({ uid, ...data }).returning()
               await tx.insert(schema.metadata).values({ uid, created_at }).returning()
               return [u]
            })
            // give user tab 'workshop'
            for (const tab of ['workshop']) {
               const tabUid = uuidv7()
               await db.transaction(async (tx) => {
                  await tx.insert(schema.user_tab_relation).values({ uid: tabUid, user_uid: user.uid, tab }).returning()
                  await tx.insert(schema.metadata).values({ uid: tabUid, created_at }).returning()
               })
            }
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
            const db = app.get('db')
            const rows = await db.update(schema.user)
               .set({ password })
               .where(eq(schema.user.uid, payload.user_uid))
               .returning()
            const user = rows[0]
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
         const db = app.get('db')
         const rows = await db.select().from(schema.user).where(eq(schema.user.email, email)).limit(1)
         const user = rows[0] ?? null
         if (!user) return
         const token = jwt.sign({ user_uid: user.uid }, config.JWT_PRIVATE_KEY, {
            algorithm: "RS256",
         })
         await app.service('mail').send({
            from: 'buisson@enseeiht.fr',
            to: email,
            subject: "SHDL, réinitialisation du mot de passe",
            text: `Cliquez <a href="${config.CLIENT_URL}/set-password/${token}">sur ce lien</a> pour réinitialiser votre mot de passe`,
         })
      },

      extendExpiration: async () => {
      },

      ping: async () => {
      },
   })

   app.service('auth').hooks(hooks)
}
