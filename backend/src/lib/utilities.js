export { truncateString, Mutex } from '@jcbuisson/express-x/server'

export function stringifyWithSortedKeys(obj) {
   return JSON.stringify(obj, Object.keys(obj).sort())
}
