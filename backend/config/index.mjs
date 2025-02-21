
export default {
   
   PORT: process.env.PORT,
   LOGS_DIR: process.env.LOGS_DIR,
   DATABASE_URL: process.env.DATABASE_URL,

   WS_TRANSPORT: true,
   WS_PATH: '/shdl-socket-io/',

   SESSION_EXPIRE_DELAY: parseInt(process.env.SESSION_EXPIRE_DELAY),

   SECRET: process.env.SECRET,

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
}

