
import nodemailer from 'nodemailer'

import config from '#config'


export default function (app) {

   // client must call it with a greater timeout than the default 5000ms
   app.createService('mail', {
      send: async ({ from, to, subject, text }) => {
         // console.log('nodemail config', config.NODEMAILER)
         // console.log('from', from, 'to', to)
         const transporter = nodemailer.createTransport(config.NODEMAILER)
         return transporter.sendMail({ from, to, subject, text, html: text })
      },
   })
}
