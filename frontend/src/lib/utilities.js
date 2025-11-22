
export function stringifyWithSortedKeys(obj, space = null) {
   return JSON.stringify(obj, (key, value) => {
      // If the value is a plain object (not an array, null, or other object type like Date)
      if (value && typeof value === 'object' && !Array.isArray(value) && Object.prototype.toString.call(value) === '[object Object]') {
         const sorted = {};
         // Get all keys, sort them, and then re-add them to a new object
         // This new object will maintain the sorted order when stringified
         Object.keys(value).sort().forEach(k => {
            sorted[k] = value[k];
         });
         return sorted;
      }
      // For all other types (primitives, arrays, null, etc.), return the value as is
      return value;
   }, space); // 'space' is optional for pretty-printing (e.g., 2 or 4)
}
console.log('stringifyWithSortedKeys({ age: 30, name: "Alice", data: { city: "Paris", color: "red" }})', stringifyWithSortedKeys({ age: 30, name: "Alice", data: { city: "Paris", color: "red" } }))

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


export function isSubset(subset, fullObject) {
   // return Object.entries(subset).some(([key, value]) => fullObject[key] === value)
   for (const key in fullObject) {
      if (fullObject[key] !== subset[key]) return false
   }
   return true
}
console.log('isSubset({a: 1, b: 2}, {b: 2})=true', isSubset({a: 1, b: 2}, {b: 2}))
console.log('isSubset({}, {})=true', isSubset({}, {}))
console.log('isSubset({a: 1}, {})=true', isSubset({a: 1}, {}))
console.log('isSubset({a: 1}, {b: 2})=false', isSubset({a: 1}, {b: 2}))
console.log('isSubset({a: 1}, {a: 1})=true', isSubset({a: 1}, {a: 1}))

export function isSubsetAmong(subset, fullObjectList) {
   return fullObjectList.some(fullObject => isSubset(subset, fullObject));
}
console.log('isSubsetAmong({a: 1, b: 2}, [{c: 3}, {b: 2}])=true', isSubsetAmong({a: 1, b: 2}, [{c: 3}, {b: 2}]))

