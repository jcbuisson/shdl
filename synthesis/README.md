# SHDL synthesis CLI

Run the published CLI with `npx`, then configure it:

```sh
npx shdl-synthesis config
npx shdl-synthesis check <moduleName>
npx shdl-synthesis synthesize <moduleName>
npx shdl-synthesis synthesize <moduleName> --memfile memory.json
```

Configuration is stored in `~/.shdl_config.json`. Set `server` to the current
SHDL backend URL (for example `http://localhost:3016` for local development or
`https://app.shdl.fr`), and choose the board and Vivado executable path.
Run `config` again to switch servers.

Both commands prompt for your SHDL account email and password. They read the
root module and its dependencies from the configured backend's current PostgreSQL
database using the authenticated `user_document.findMany` service. Only documents
owned by that account with type `shdl` and the requested name are selected.
Each module name must match exactly one SHDL document. Save/sync editor changes
to the server before running the CLI.

The CLI uses the current Express-X Socket.IO acknowledgement protocol at
`/shdl-socket-io/`; no database credentials or browser Electric cache are needed.
Synthesis requires Vivado and the target board.

Run the document-loading and protocol regression tests with `npm test`.
