
export class SHDLError extends Error {

   moduleName: string
   location: any

   constructor(message: string, moduleName: string, location: any) {

      super(message) // Pass the message to the base Error class
      this.name = this.constructor.name
      this.moduleName = moduleName
      this.location = location
   }

   toString() {
      return `moduleName=${this.moduleName}, location=${this.location}, message=${this.message}`
   }
}
