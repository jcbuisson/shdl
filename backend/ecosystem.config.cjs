
module.exports = {
   apps : [

      {
         name: "shdl",
         script: "./src/app.js",
         watch: false,
         
         node_args: [
            "--env-file=.env",
         ]
      },

   ]
}
