
export function stringifyWithSortedKeys(obj) {
   return JSON.stringify(obj, Object.keys(obj).sort())
}
console.log('stringifyWithSortedKeys({ age: 30, name: "Alice", city: "Paris" })', stringifyWithSortedKeys({ age: 30, name: "Alice", city: "Paris" }))


export function truncateString(str, maxLength = 300, ellipsis = '...') {
   // Check if the string already fits
   if (str.length <= maxLength) {
      return str;
   }

   // Calculate the cut-off point, accounting for the ellipsis length
   const cutLength = maxLength - ellipsis.length;
   
   // Ensure the string is long enough to be cut
   if (cutLength < 0) {
         return str.substring(0, maxLength); // Just cut it off if ellipsis doesn't fit
   }

   // Truncate the string and add the ellipsis
   return str.substring(0, cutLength) + ellipsis;
}


export class Mutex {
   constructor() {
      this.locked = false;
      this.queue = [];
   }

   async acquire() {
      if (this.locked) {
         return new Promise(resolve => this.queue.push(resolve));
      }
      this.locked = true;
   }

   release() {
      if (this.queue.length > 0) {
         const next = this.queue.shift();
         next();
      } else {
         this.locked = false;
      }
   }
}