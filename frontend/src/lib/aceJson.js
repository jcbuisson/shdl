import ace from 'ace-builds'
import 'ace-builds/src-noconflict/mode-json'
import jsonWorkerUrl from 'ace-builds/src-noconflict/worker-json.js?url'

// Let Vite emit the worker asset instead of resolving it relative to the page route.
ace.config.setModuleUrl('ace/mode/json_worker', jsonWorkerUrl)

export default ace
