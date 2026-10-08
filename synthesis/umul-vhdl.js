// Group output bits by their flattened operand indexes, like memory blocks.
export function umulVhdl(equipotentials) {
   const blocks = new Map()
   let statements = ''
   for (const eq of equipotentials) {
      if (!eq || eq.type !== 'umul16x16') continue
      const key = JSON.stringify([eq.aInputs, eq.bInputs])
      if (!blocks.has(key)) blocks.set(key, { index: blocks.size, a: eq.aInputs, b: eq.bInputs })
      const block = blocks.get(key)
      statements += `   eq${eq.index} <= umul_${block.index}_product(${eq.mulOutBit});\n`
   }
   let declarations = blocks.size ? '   attribute use_dsp : string;\n' : ''
   for (const { index, a, b } of blocks.values()) {
      declarations += `   signal umul_${index}_a, umul_${index}_b : unsigned(15 downto 0);
   signal umul_${index}_product : unsigned(31 downto 0);
   attribute use_dsp of umul_${index}_product : signal is "yes";
`
      for (const [operand, indexes] of [['a', a], ['b', b]]) {
         indexes.forEach((eqIndex, bit) => {
            statements += `   umul_${index}_${operand}(${15 - bit}) <= eq${eqIndex};\n`
         })
      }
      statements += `   umul_${index}_product <= umul_${index}_a * umul_${index}_b;\n`
   }
   return { declarations, statements }
}
