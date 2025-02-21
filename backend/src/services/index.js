
// database services
import userService from './database/user/user.service.js'

// custom services
import authService from './custom/auth/auth.service.js'
import mailService from './custom/mail/mail.service.js'


export default function (app) {
   // add database services
   app.configure(userService)

   // add custom services
   app.configure(authService)
   app.configure(mailService)
}
