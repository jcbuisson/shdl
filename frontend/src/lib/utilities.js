
export function sortedJson(obj) {
   return JSON.stringify(obj, Object.keys(obj).sort())
}
console.log('sortedJson({ age: 30, name: "Alice", city: "Paris" })', sortedJson({ age: 30, name: "Alice", city: "Paris" }))


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
