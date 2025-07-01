
export class SHDLError extends Error {
   constructor(message, moduleName, location) {
      super(message) // Pass the message to the base Error class
      this.name = this.constructor.name
      this.moduleName = moduleName
      this.location = location
   }
}