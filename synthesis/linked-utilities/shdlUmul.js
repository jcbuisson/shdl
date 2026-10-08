import { argumentArity, argumentAt, createEquipotential } from './shdlUtilities.js'

export function checkUmul16x16(instance) {
   const fail = message => ({ message, location: instance.location })
   if (instance.arguments.length !== 3) return fail('$umul16x16 requires three arguments: a[15..0], b[15..0], smul[31..0]')
   for (let i = 0; i < 3; i++) {
      const width = i === 2 ? 32 : 16
      const argument = instance.arguments[i]
      if (argument.signalorliterals.some(signal => signal.type === 'vector' && signal.start < signal.stop)) {
         return fail('$umul16x16 vector indices must be in decreasing order')
      }
      if (argumentArity(argument) !== width) return fail(`$umul16x16 argument #${i + 1} must have an arity of ${width}`)
   }
   if (instance.arguments[2].signalorliterals.some(signal => signal.type !== 'scalar' && signal.type !== 'vector')) {
      return fail('$umul16x16 output cannot contain constants')
   }
}

// Store one dedicated multiplier output per bit, as for memory built-ins.
// Input arrays are ordered most significant bit first.
export function collectUmul16x16(instance, equipotentials) {
   const input = (argument, bit) => {
      const name = argumentAt(argument, bit)
      const index = equipotentials['__' + name]
      if (index !== undefined) return index
      const eq = createEquipotential(name, equipotentials)
      eq.type = name.startsWith('>') ? 'constant' : null
      if (eq.type === 'constant') eq.cvalue = name === '>1' ? 1 : 0
      return eq.index
   }
   const aInputs = Array.from({ length: 16 }, (_, bit) => input(instance.arguments[0], bit))
   const bInputs = Array.from({ length: 16 }, (_, bit) => input(instance.arguments[1], bit))
   for (let bit = 0; bit < 32; bit++) {
      const name = argumentAt(instance.arguments[2], bit)
      const index = equipotentials['__' + name]
      const eq = index === undefined ? createEquipotential(name, equipotentials) : equipotentials[index]
      if (eq.type != null && !eq.isInput) {
         return { message: `signal '${name}' is assigned several times`, location: instance.location }
      }
      eq.type = 'umul16x16'
      eq.aInputs = aInputs
      eq.bInputs = bInputs
      eq.mulOutBit = 31 - bit
   }
}

// JavaScript numbers exactly represent every unsigned 16-by-16 product.
export function evaluateUmul16x16(equipotential, dataArray) {
   const read = indexes => {
      let value = 0
      for (const index of indexes) {
         const bit = dataArray[index]
         if (bit !== true && bit !== false) return null
         value = value * 2 + Number(bit)
      }
      return value
   }
   const a = read(equipotential.aInputs)
   const b = read(equipotential.bInputs)
   if (a === null || b === null) return null
   return ((a * b) >>> equipotential.mulOutBit & 1) === 1
}
