
export class SHDLError extends Error {

   documentUID: string
   moduleName: string
   location: any

   constructor(message: string, documentUID: string, moduleName: string, location: any) {

      super(message) // Pass the message to the base Error class
      this.name = this.constructor.name
      this.documentUID = documentUID
      this.moduleName = moduleName
      this.location = location
   }

   toString() {
      return `name=${this.name}, documentUID=${this.documentUID}, moduleName=${this.moduleName}, location=${this.location}, message=${this.message}`
   }
}
