
export default function useWorker(worker) {

   const pendingPromises = new Map();
   let messageId = 0; // Simple counter for unique IDs

   // worker response listener
   worker.onmessage = (event) => {
      const { id, result, error } = event.data;
      
      // Find the corresponding Promise handlers
      const handlers = pendingPromises.get(id);

      if (handlers) {
         if (error) {
            handlers.reject(new Error(error));
         } else {
            handlers.resolve(result);
         }
         // Remove the handler as the Promise is now settled
         pendingPromises.delete(id);
      }
   };

   // promise wrapper function
   function sendToWorker(data) {
      return new Promise((resolve, reject) => {
         const id = messageId++;
         
         // Store the resolve/reject functions
         pendingPromises.set(id, { resolve, reject });

         // Send the message with the unique ID
         worker.postMessage({ id, data });
      });
   }

   return { sendToWorker };
}
