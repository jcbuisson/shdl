#!/usr/bin/env node

/*
https://forum.digilentinc.com/topic/2267-running-vivado-from-the-command-line/
http://www.xilinx.com/support/documentation/sw_manuals/xilinx2016_2/ug835-vivado-tcl-commands.pdf?_ga=2.172797860.622354474.1562229744-33058165.1562229744
https://www.xilinx.com/support/documentation/sw_manuals/xilinx14_6/xst_v6s6.pdf

vivado -mode batch -source <your_Tcl_script>
*/

const program = require('commander')
const os = require('os')
const fsp = require('fs').promises // node 10+
const path = require('path')
const axios = require('axios')
const inquirer = require('inquirer')
const jwt = require('jsonwebtoken')

const synthesizer = require('./synthesizer.js')
const boards = require('./boards.js')
const fetcher = require('./linked-utilities/shdlFetch.js')
const analyser = require('./linked-utilities/shdlAnalyser.js')

const secret = "MYSECRET"


async function handleOptions(options) {
   // get config data
   let configPath = path.join(os.homedir(), '.shdl_config.json')
   let configJSONString = await fsp.readFile(configPath)
   let config = JSON.parse(configJSONString)

   // check that config.json contains server & board
   if (!config.server) throw ({ message: "*** error: server url missing in config" })
   if (!config.board) throw ({ message: "*** error: board name missing in config" })
   if (!boards[config.board.toLowerCase()]) throw ({ message: `*** error: unknown board name: ${config.board}` })

   let jwtOK
   if (config.jwt) {
      // jwt is present in config
      try {
         // check its signature
         jwt.verify(config.jwt, secret)
         // check its expiration date
         let jwtPayload = jwt.decode(config.jwt)
         jwtOK = (jwtPayload.exp && Math.floor(Date.now() / 1000) < jwtPayload.exp)
      } catch (err) {
         // verification failed
         jwtOK = false
      }
   }
   // ask the server a new jwt if necessary
   if (!jwtOK) {
      if (options.verbose) console.log("Getting new authentication token...")
      // get username /password
      let credentials = await inquirer.prompt([
         {
            name: 'username',
            type: 'text',
            message: "Enter SHDL platform username:",
         },
         {
            name: 'password',
            type: 'password',
            message: "Enter password:",
         }
      ])
      // send username/password to server to get a fresh valid JWT
      let response = await axios({
         method: 'post',
         url: `${config.server}/api/api-token-auth`,
         data: {
            username: credentials.username,
            password: credentials.password
         }
      })
      config.jwt = response.data
      // update config file
      configJSONString = JSON.stringify(config, null, 3)
      await fsp.writeFile(configPath, configJSONString)
   }

   // collect synthesis arguments
   let jwtPayload = jwt.decode(config.jwt)
   let userId = jwtPayload.user_id
   let board = boards[config.board.toLowerCase()]
   let server = config.server
   let vivadoPath = config.vivado
   let jwtToken = config.jwt

   // fetch team if specified
   let teamId = 0
   if (options.team) {
      let response = await axios({
         method: 'get',
         headers: { "Authorization": `JWT ${config.jwt}` },
         url: `${config.server}/api/teams?user=${userId}&name=${options.team}`,
      })
      if (response.data.length === 0) {
         throw ({ message: `*** error: you are not a member of any team named '${options.team}'` })
      } else {
         teamId = response.data[0].id
      }
   }
   return { userId, teamId, board, server, vivadoPath, jwtToken }
}

function displayModuleStructure(module, name2module, prefix) {
   // display module name
   console.log(prefix, module.structure.name)
   // display structure of its sub-modules, right-shifted
   module.structure.instances.forEach(function(instance) {
      if (instance.type === 'module_instance') {
         let submodule = name2module[instance.name]
         displayModuleStructure(submodule, name2module, prefix + '   ')
      } else if (instance.type === 'predefined_module_instance') {
         if (instance.name === 'rom') {
            console.log(prefix + '   ', instance.name, `(memory index: ${instance.memUUID})`)
         } else if (instance.name === 'ram_aread_swrite') {
            console.log(prefix + '   ', instance.name, `(memory index: ${instance.memUUID})`)
         } else {
            console.log(prefix + '   ', instance.name)
         }
      }
   })
}

program
   .command('check <moduleName>')
   .description("Check SHDL module <moduleName> and display its hierarchy")
   .option("-v, --verbose", "Verbose")
   .option("-t, --team <teamName>", "Use modules from <teamName>")
   .action(async function (moduleName, options) {
      try {
         // handle options
         let { userId, teamId, board, server, vivadoPath, jwtToken } = await handleOptions(options)
         // fetch module
         let name2module = await fetcher.fetchModuleTreeFromServer(moduleName, userId, teamId, server, jwtToken, options)
         let module = name2module[moduleName]
         // perform a full semantic check
         let { err, moduleList } = analyser.checkModule(module.name, name2module)
         if (err) throw err
         // display module structure
         displayModuleStructure(module, name2module, '')
      } catch (error) {
         console.error(error.message)
      }
   })

program
   .command('build <moduleName>')
   .description("Synthesize SHDL module <moduleName>")
   .option("-m, --memfile <memFile>", "Initialize memory blocks with <memFile>")
   .option("-v, --verbose", "Verbose")
   .option("-t, --team <teamName>", "Use modules from <teamName>")
   .action(async function(moduleName, options) {
      try {
         // handle options
         let { userId, teamId, board, server, vivadoPath, jwtToken } = await handleOptions(options)
         // start synthesis
         await synthesizer.synthesize(moduleName, userId, teamId, board, server, vivadoPath, jwtToken, options)
      } catch (error) {
         console.error(error.message)
      }
   })

program
   .command('config')
   .description("View/set configuration of shdl tools")
   .action(async function (options) {
      try {
         // get config data
         let configPath = path.join(os.homedir(), '.shdl_config.json')
         let config
         try {
            let configJSONString = await fsp.readFile(configPath)
            config = JSON.parse(configJSONString)
         } catch(err) {
            await fsp.writeFile(configPath, '{}')
            config = {}
         }
         config = await inquirer.prompt([
            {
               name: 'server',
               type: 'text',
               message: "Enter SHDL platform url:",
               default: config.server || "https://shdl.fr",
            },
            {
               name: 'board',
               type: 'text',
               message: "Enter board name:",
               default: config.board || "Nexys4"
            },
            {
               name: 'vivado',
               type: 'text',
               message: "Enter Vivado executable path:",
               default: config.vivado || "/usr/local/bin/vivado"
            },
         ])
         await fsp.writeFile(configPath, JSON.stringify(config, null, 3))
      } catch (error) {
         console.error(error.message)
      }
   })

program
   .command('*')
   .action(function () {
      program.help()
   })


program.parse(process.argv)

if (program.args.length === 0) {
   program.help()
}
