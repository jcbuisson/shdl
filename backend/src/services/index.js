
// database services
import metadataService from './database/metadata/metadata.service.js'

import userService from './database/user/user.service.js'
import groupService from './database/group/group.service.js'
import userTabRelationService from './database/user_tab_relation/user_tab_relation.service.js'
import userGroupRelationService from './database/user_group_relation/user_group_relation.service.js'
import userShdlModuleService from './database/user_shdl_module/user_shdl_module.service.js'

// custom services
import authService from './custom/auth/auth.service.js'
import syncService from './custom/sync/sync.service.js'
import mailService from './custom/mail/mail.service.js'
import fileUploadService from './custom/file-upload/file-upload.service.mjs'


export default function (app) {
   // add database services
   app.configure(metadataService)

   app.configure(userService)
   app.configure(groupService)
   app.configure(userTabRelationService)
   app.configure(userGroupRelationService)
   app.configure(userShdlModuleService)

   // add custom services
   app.configure(authService)
   app.configure(syncService)
   app.configure(mailService)
   app.configure(fileUploadService)
}
