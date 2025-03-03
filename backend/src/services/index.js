
// database services
import userService from './database/user/user.service.js'
import groupService from './database/group/group.service.js'
import userGroupService from './database/user_group/user_group.service.js'

// custom services
import authService from './custom/auth/auth.service.js'
import mailService from './custom/mail/mail.service.js'
import fileUploadService from './custom/file-upload/file-upload.service.mjs'


export default function (app) {
   // add database services
   app.configure(userService)
   app.configure(groupService)
   app.configure(userGroupService)

   // add custom services
   app.configure(authService)
   app.configure(mailService)
   app.configure(fileUploadService)
}
