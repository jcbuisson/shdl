import test from 'node:test'
import assert from 'node:assert/strict'
import { checkModule } from '../linked-utilities/shdlAnalyser.js'
import { checkUmul16x16, collectUmul16x16, evaluateUmul16x16 } from '../../frontend/src/lib/shdl/shdlUmul.js'
import { peg$parse } from '../linked-utilities/parser.js'
import { umulVhdl } from '../umul-vhdl.js'
import { readFile } from 'node:fs/promises'

function evaluate(module, a, b, output = 'p') {
   const cache = new Map()
   function formula(f) {
      if (typeof f === 'string') return Number(f)
      if (f.op === 'and') return Number(f.args.every(formula))
      if (f.op === 'or') return Number(f.args.some(formula))
      return value(f.equipotentialIndex) ^ Number(f.inverted)
   }
   function value(index) {
      if (cache.has(index)) return cache.get(index)
      const eq = module.equipotentials[index]
      const match = /^([ab])\[(\d+)\]$/.exec(eq.name)
      const result = eq.type === 'umul16x16' ? Number(evaluateUmul16x16(eq, eq.aInputs.concat(eq.bInputs).reduce((data, index) => { data[index] = Boolean(value(index)); return data }, []))) : eq.type === null ? ((match[1] === 'a' ? a : b) >>> Number(match[2])) & 1
         : eq.type === 'constant' ? eq.cvalue : formula(eq.formula)
      cache.set(index, result)
      return result
   }
   let result = 0
   for (let bit = 31; bit >= 0; bit--) result = result * 2 + value(module.equipotentials[`__${output}[${bit}]`])
   return result
}
const text = 'module mul(a[15..0], b[15..0], p[31..0]) $umul16x16(a[15..0], b[15..0] : p[31..0]) end module'

test('unsigned multiplication in synthesis and browser netlists', () => {
   const module = { name: 'mul', text }
   assert.equal(checkModule('mul', { mul: module }).err, null)
   assert.equal(module.equipotentials.length, 64)
   const instance = peg$parse(text).instances[0]
   assert.equal(checkUmul16x16(instance), undefined)
   const browser = { equipotentials: [] }
   assert.equal(collectUmul16x16(instance, browser.equipotentials), undefined)
   const cases = [[0, 65535], [1, 65535], [65535, 65535], [32768, 32768], [32768, 2], [12345, 54321]]
   let seed = 42
   for (let i = 0; i < 100; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
      cases.push([seed & 65535, seed >>> 16])
   }
   for (const [a, b] of cases) {
      assert.equal(evaluate(module, a, b), a * b)
      assert.equal(evaluate(browser, a, b), a * b)
   }
})

test('rejects invalid argument counts, widths, ordering, constants and multiple drivers', () => {
   for (const invocation of [
      '$umul16x16(a[15..0], b[15..0])',
      '$umul16x16(a[14..0], b[15..0], p[31..0])',
      '$umul16x16(a[15..0], b[14..0], p[31..0])',
      '$umul16x16(a[15..0], b[15..0], p[30..0])',
      '$umul16x16(a[0..15], b[15..0], p[31..0])',
      '$umul16x16(a[15..0], b[15..0], "00000000000000000000000000000000")',
      '$umul16x16(a[15..0], b[15..0], p[31..0]) p[0] = 0',
   ]) {
      const module = { name: 'mul', text: `module mul(a[15..0], b[15..0], p[31..0]) ${invocation} end module` }
      assert.ok(checkModule('mul', { mul: module }).err, invocation)
   }
})

test('supports literal inputs and flattened submodules with multiple instances', () => {
   const child = { name: 'mul', text }
   const root = { name: 'root', text: 'module root(a[15..0], b[15..0], p[31..0], q[31..0]) mul(a[15..0], b[15..0], p[31..0]) mul("1111111111111111", "1111111111111111", q[31..0]) end module' }
   assert.equal(checkModule('root', { root, mul: child }).err, null)
   assert.equal(evaluate(root, 65535, 65535), 4294836225)
   assert.equal(evaluate(root, 0, 0, 'q'), 4294836225)
   const vhdl = umulVhdl(root.equipotentials)
   assert.equal((vhdl.statements.match(/_product <=/g) || []).length, 2)
   assert.equal((vhdl.declarations.match(/signal is "yes"/g) || []).length, 2)
   assert.match(vhdl.declarations, /unsigned\(31 downto 0\)/)
   assert.match(vhdl.statements, /umul_0_a\(15\) <= eq\d+;/)
   assert.match(vhdl.statements, /umul_0_product <= umul_0_a \* umul_0_b;/)
   assert.equal((vhdl.statements.match(/<= umul_\d+_product\(/g) || []).length, 64)
})

test('dedicated simulation preserves unsigned high bits and unknown inputs', () => {
   const eq = { aInputs: Array.from({ length: 16 }, (_, i) => i), bInputs: Array.from({ length: 16 }, (_, i) => i + 16), mulOutBit: 31 }
   const data = Array(32).fill(true)
   assert.equal(evaluateUmul16x16(eq, data), true)
   data[0] = null
   assert.equal(evaluateUmul16x16(eq, data), null)
   data[0] = undefined
   assert.equal(evaluateUmul16x16(eq, data), null)
})

test('browser analyzer remaps aliases and nested multipliers and tracks dependencies', async () => {
   // Load the browser's plain-JavaScript TS sources with its Vite imports resolved.
   const directory = new URL('../../frontend/src/lib/shdl/', import.meta.url)
   const load = async filename => {
      let source = await readFile(new URL(filename, directory), 'utf8')
      source = source.replace(/'\/src\/lib\/shdl\/shdlUtilities'/g, JSON.stringify(new URL('shdlUtilities.js', directory).href))
      source = source.replace(/'\.\/shdlUmul.js'/g, JSON.stringify(new URL('shdlUmul.js', directory).href))
      return source
   }
   const syntaxUrl = 'data:text/javascript;base64,' + Buffer.from(await load('shdlSyntax.ts')).toString('base64')
   const analyzer = (await load('shdlAnalyzer.ts')).replace("'/src/lib/shdl/shdlSyntax'", JSON.stringify(syntaxUrl))
   const { checkModuleMap } = await import('data:text/javascript;base64,' + Buffer.from(analyzer).toString('base64'))
   const child = { name: 'mul', structure: peg$parse(text), submoduleNames: [] }
   const root = { name: 'root', structure: peg$parse('module root(a[15..0], b[15..0], p[31..0], q[31..0]) x[15..0] = a[15..0] mul(x[15..0], b[15..0], p[31..0]) mul(b[15..0], a[15..0], q[31..0]) end module'), submoduleNames: ['mul'] }
   assert.equal((await checkModuleMap({ root, mul: child })).err, null)
   assert.equal(evaluate(root, 65535, 65535), 4294836225)
   assert.equal(evaluate(root, 12345, 54321, 'q'), 12345 * 54321)
   const input = root.equipotentials[root.equipotentials['__a[0]']]
   assert.equal(input.usedBy.length, 64)
   assert.equal(input.isUnused, false)
   for (const eq of root.equipotentials) {
      if (eq?.type === 'umul16x16') assert.equal(eq.uses.length, 32)
   }
})
