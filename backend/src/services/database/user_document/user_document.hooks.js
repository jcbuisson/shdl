
import { isAuthenticated } from '#root/src/hooks.mjs'


export default {
   before: {
      all: [isAuthenticated],
   },
}
