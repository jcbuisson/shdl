#!/usr/bin/env node

/*
https://forum.digilentinc.com/topic/2267-running-vivado-from-the-command-line/
http://www.xilinx.com/support/documentation/sw_manuals/xilinx2016_2/ug835-vivado-tcl-commands.pdf?_ga=2.172797860.622354474.1562229744-33058165.1562229744
https://www.xilinx.com/support/documentation/sw_manuals/xilinx14_6/xst_v6s6.pdf

vivado -mode batch -source <your_Tcl_script>
*/

import program from 'commander';
import os from 'os';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import inquirer from 'inquirer';
import jwt from 'jsonwebtoken';

import { io, Socket } from "socket.io-client";
import expressXClient from "@jcbuisson/express-x-client";

import { synthesize } from './synthesizer.js';
import boards from './boards.js';
import { fetchModuleTreeFromServer } from './linked-utilities/shdlFetch.js';
import { checkModule } from './linked-utilities/shdlAnalyser.js';

const secret = "MYSECRET";


async function handleOptions(options) {
   // get config data
   let configPath = path.join(os.homedir(), '.shdl_config.json')
   let configJSONString = await fs.promises.readFile(configPath)
   let config = JSON.parse(configJSONString)

   // check that config.json contains server & board
   if (!config.server) throw ({ message: "*** error: server url missing in config" })
   if (!config.board) throw ({ message: "*** error: board name missing in config" })
   if (!boards[config.board.toLowerCase()]) throw ({ message: `*** error: unknown board name: ${config.board}` })

   const socket = io('http://localhost:3000', {
      path: '/shdl-socket-io/',
      transports: ["websocket"],
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
   });
   const app = expressXClient(socket, { debug: false });
   const credentials = await inquirer.prompt([
      {
         name: 'email',
         type: 'email',
         message: "Enter email:",
      },
      {
         name: 'password',
         type: 'password',
         message: "Enter password:",
      }
   ])
   const { user } = await app.service('auth').signin(credentials.email, credentials.password)

   // collect synthesis arguments
   let userUid = user.uid
   let board = boards[config.board.toLowerCase()]
   let server = config.server
   let vivadoPath = config.vivado
   let jwtToken = config.jwt
   return { app, userUid, board, server, vivadoPath }
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
   .action(async function (moduleName, options) {
      try {
         // handle options
         let { app, userUid, server, jwtToken } = await handleOptions(options)
         // fetch module
         let name2module = await fetchModuleTreeFromServer(app, moduleName, userUid, server, jwtToken, options)
         let module = name2module[moduleName]
         // perform a full semantic check
         let { err, moduleList } = checkModule(module.name, name2module)
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
   .action(async function(moduleName, options) {
      try {
         // handle options
         let { app, userUid, board, server, vivadoPath, jwtToken } = await handleOptions(options)
         // start synthesis
         await synthesize(app, moduleName, userUid, board, server, vivadoPath, jwtToken, options)
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
            let configJSONString = await fs.promises.readFile(configPath)
            config = JSON.parse(configJSONString)
         } catch(err) {
            await fs.promises.writeFile(configPath, '{}')
            config = {}
         }
         config = await inquirer.prompt([
            {
               name: 'server',
               type: 'text',
               message: "Enter SHDL platform url:",
               default: config.server || "https://app.shdl.fr",
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
         await fs.promises.writeFile(configPath, JSON.stringify(config, null, 3))
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
