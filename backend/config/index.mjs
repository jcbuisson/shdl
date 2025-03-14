
export default {
   
   PORT: process.env.PORT,
   LOGS_DIR: process.env.LOGS_DIR,
   DATABASE_URL: process.env.DATABASE_URL,
   CLIENT_URL: process.env.CLIENT_URL,

   WS_TRANSPORT: true,
   WS_PATH: '/shdl-socket-io/',

   SESSION_EXPIRE_DELAY: parseInt(process.env.SESSION_EXPIRE_DELAY),

   EMAIL_FROM: process.env.MAIL_SENDER,
   NODEMAILER: {
      host: process.env.MAIL_HOST,
      port: process.env.MAIL_PORT,
      secure: false,
      auth: {
         user: process.env.MAIL_USER,
         pass: process.env.MAIL_PASSWORD,
      },
      name: process.env.MAIL_DOMAIN,
   },

   JWT_PRIVATE_KEY: process.env.JWT_PRIVATE_KEY,

   UPLOAD_AVATARS_PATH: process.env.UPLOAD_AVATARS_PATH,
}

