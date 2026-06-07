export { truncateString, Mutex } from '@jcbuisson/express-x'

export function stringifyWithSortedKeys(obj) {
   return JSON.stringify(obj, Object.keys(obj).sort())
}
