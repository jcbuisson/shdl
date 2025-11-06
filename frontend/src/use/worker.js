
onmessage = (e) => {
   console.log("Worker: Message received from main script", e);

   postMessage({ c: 3, d: 4 });

};
