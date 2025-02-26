
import { protect } from '#root/src/common-server.mjs'
import { isAuthenticated } from '#root/src/hooks.mjs'

import config from '#config'


export default {
   before: {
      all: [isAuthenticated],
   },
   after: {
      all: [protect('password')],
   }
}
