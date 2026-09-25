import test from 'node:test'
import assert from 'node:assert/strict'
import { createServerClient } from '../server-client.js'
import { fetchModuleTreeFromServer } from '../linked-utilities/shdlFetch.js'

function clientFor(handler) {
   return createServerClient({
      timeout(ms) { assert.equal(ms, 20000); return this },
      async emitWithAck(event, request) {
         assert.equal(event, 'client-request')
         return handler(request)
      },
      disconnect() {},
   })
}

test('loads root and shared dependencies with current database filters', async () => {
   const documents = [
      { user_uid: 'alice', type: 'shdl', name: 'root', text: 'module root(a,b) child(a,b) child(a,b) end module' },
      { user_uid: 'alice', type: 'shdl', name: 'child', text: 'module child(a,b) b = a end module' },
      { user_uid: 'bob', type: 'shdl', name: 'root', text: 'wrong user' },
      { user_uid: 'alice', type: 'text', name: 'root', text: 'wrong type' },
   ]
   const calls = []
   const app = clientFor(({ name, action, args: [where] }) => {
      assert.equal(name, 'user_document')
      assert.equal(action, 'findMany')
      assert.deepEqual(Object.keys(where).sort(), ['name', 'type', 'user_uid'])
      calls.push(where.name)
      return { result: documents.filter(doc => Object.entries(where).every(([key, value]) => doc[key] === value)) }
   })
   const modules = await fetchModuleTreeFromServer(app, 'root', 'alice', {})
   assert.deepEqual(calls, ['root', 'child'])
   assert.equal(modules.child.structure.name, 'child')
})

test('reports missing and duplicate documents', async () => {
   for (const [rows, message] of [[[], /could not find/], [[{}, {}], /multiple SHDL documents/]]) {
      await assert.rejects(fetchModuleTreeFromServer(clientFor(() => ({ result: rows })), 'root', 'alice', {}), message)
   }
})

test('preserves server errors while fetching dependencies', async () => {
   const app = clientFor(({ args: [where] }) => where.name === 'root'
      ? { result: [{ text: 'module root(a,b) child(a,b) end module' }] }
      : { error: { code: 'not-authenticated', message: 'Session expired' } })
   await assert.rejects(fetchModuleTreeFromServer(app, 'root', 'alice', {}), {
      code: 'not-authenticated', message: 'Session expired',
   })
})

test('authentication uses the acknowledgement result', async () => {
   const app = clientFor(request => {
      assert.deepEqual(request, { name: 'auth', action: 'signin', args: ['alice@example.com', 'password'] })
      return { result: { user: { uid: 'alice' } } }
   })
   assert.deepEqual(await app.service('auth').signin('alice@example.com', 'password'), { user: { uid: 'alice' } })
})
