export function getMemoryInstances(equipotentials) {
   const instances = new Map()
   for (const signal of equipotentials) {
      if (!signal || !['rom', 'ram_aread_swrite'].includes(signal.type)) continue
      if (!instances.has(signal.memUUID)) instances.set(signal.memUUID, [])
      instances.get(signal.memUUID)[signal.memOutIndex] = signal
   }
   return [...instances.entries()].sort(([a], [b]) => a - b).map(([, signals]) => signals)
}

function binary(value, width, label) {
   if (typeof value !== 'string') throw new Error(`${label} : une chaîne est attendue.`)
   let bits = value.replace(/\s/g, '')
   if (/^0x[0-9a-f]+$/i.test(bits)) bits = BigInt(bits).toString(2).padStart(width, '0')
   if (!/^[01]+$/.test(bits) || bits.length !== width) {
      throw new Error(`${label} : ${width} bits attendus.`)
   }
   return bits
}

export function loadMemoryContents(text, instances) {
   let contents
   try {
      contents = JSON.parse(text)
   } catch {
      throw new Error('Le fichier ne contient pas un JSON valide.')
   }
   if (!Array.isArray(contents) || contents.length !== instances.length) {
      throw new Error(`Le JSON doit contenir un tableau de ${instances.length} bloc(s) mémoire.`)
   }
   // Validate every block before changing any memory.
   const prepared = contents.map((block, index) => {
      if (!block || typeof block !== 'object' || Array.isArray(block)) {
         throw new Error(`Bloc ${index + 1} : un objet adresse / valeur est attendu.`)
      }
      const memory = instances[index]
      return Object.entries(block).map(([address, value]) => {
         const bits = binary(address, memory[0].addrs.length, `Bloc ${index + 1}, adresse ${address}`)
         const data = binary(value, memory.length, `Bloc ${index + 1}, valeur à ${address}`)
         return [Array.from(bits, bit => bit === '1').join(','), data]
      })
   })
   prepared.forEach((entries, index) => {
      const memory = instances[index]
      for (const [address, data] of entries) {
         for (const signal of memory) {
            signal.dict[address] = data[memory.length - signal.memOutIndex - 1] === '1'
         }
      }
   })
}
