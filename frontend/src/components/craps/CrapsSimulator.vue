<template>
   <v-card class="d-flex flex-column fill-height" style="overflow: hidden;">

      <!-- Controls -->
      <div class="d-flex align-center flex-wrap px-2 py-1" style="gap: 6px; border-bottom: 1px solid #e0e0e0;">
         <v-btn density="compact" icon="mdi-restart" variant="text" @click="reset" title="Reset"></v-btn>
         <v-btn density="compact" :icon="running ? 'mdi-pause' : 'mdi-play'" variant="text"
            :disabled="inError || !hasMemory" @click="runStop" title="Run / Pause"></v-btn>
         <v-btn density="compact" icon="mdi-debug-step-over" variant="text"
            :disabled="inError || !stopped || !hasMemory" @click="step" title="Step"></v-btn>
         <span class="text-caption">{{ cycleCount }} cycles</span>

         <!-- Speed slider: 0 = max speed, 500 = very slow -->
         <div class="d-flex align-center" style="gap: 3px; margin-left: 6px; width: 110px;">
            <v-icon size="small" style="color: #aaa;">mdi-speedometer</v-icon>
            <v-slider v-model="sliderValue" :min="0" :max="100" :step="1"
               density="compact" hide-details
               thumb-size="12" track-size="2"
               style="min-width: 0;"
               :title="`Délai : ${stepDelay} ms/instruction (0 = max)`">
            </v-slider>
         </div>

         <!-- Flags -->
         <div class="d-flex align-center" style="gap: 3px; margin-left: 4px;">
            <v-chip v-for="(name, i) in ['N','Z','V','C']" :key="name"
               size="x-small" :color="flags[i] ? 'blue' : 'grey-lighten-2'" variant="flat" label>
               {{ name }}
            </v-chip>
         </div>

         <!-- IT interrupt button -->
         <v-btn density="compact" icon="mdi-lightning-bolt" variant="text"
            :disabled="!hasMemory" @click="sendIT" title="Interruption matérielle (IT)"></v-btn>
      </div>

      <!-- Error or status message -->
      <div v-if="errorMsg" class="px-2 py-1 text-caption" style="color: #c62828; border-bottom: 1px solid #e0e0e0;">
         {{ errorMsg }}
      </div>
      <div v-else-if="codeChanged && hasMemory" class="px-2 py-1 text-caption"
         style="background: #fff8e1; border-bottom: 1px solid #e0e0e0; cursor: pointer;" @click="applyCodeChange">
         ⚠ Code modifié — cliquer pour recharger
      </div>

      <!-- I/O -->
      <div class="px-2 py-1" style="border-bottom: 1px solid #e0e0e0; font-family: monospace; font-size: 0.8em;">
         <div class="d-flex align-center" style="gap: 2px;">
            <span style="width: 60px; color: #666;">Leds</span>
            <span v-for="i in 16" :key="'l'+i"
               :style="{ color: leds[16-i] ? '#f9a825' : '#bdbdbd', fontSize: '18px', cursor: 'default' }">●</span>
         </div>
         <div class="d-flex align-center" style="gap: 2px; margin-top: 2px;">
            <span style="width: 60px; color: #666;">Switches</span>
            <span v-for="i in 16" :key="'s'+i"
               :style="{ color: switches[16-i] ? '#1565c0' : '#bdbdbd', fontSize: '18px', cursor: 'pointer' }"
               @click="toggleSwitch(16-i)">{{ switches[16-i] ? '▣' : '□' }}</span>
         </div>
      </div>

      <!-- Memory + Registers -->
      <div class="d-flex flex-row flex-grow-1" style="overflow: hidden; min-height: 0;">

         <!-- Memory table -->
         <div class="flex-grow-1 overflow-auto" style="font-family: monospace; font-size: 0.75em;">
            <table style="width: 100%; border-collapse: collapse;">
               <template v-for="entry in memoryEntries" :key="entry.address ?? 'sep-' + entry.sepKey">
                  <tr v-if="entry.separator" style="height: 6px; background: #f5f5f5;">
                     <td colspan="4" style="border-top: 1px dashed #ccc;"></td>
                  </tr>
                  <tr v-else
                     :id="'memrow-' + entry.address"
                     :style="{
                        background: entry.address === currentAddress
                           ? '#fffde7'
                           : breakpoints.has(entry.address) ? '#ffebee' : '',
                        outline: entry.address === currentAddress ? '2px solid #f9a825' : 'none',
                        outlineOffset: '-2px',
                        cursor: 'pointer',
                     }"
                     @click="toggleBreakpoint(entry.address)">
                     <td style="padding: 1px 4px; color: #9e9e9e; white-space: nowrap;">{{ hex8(entry.address) }}</td>
                     <td style="padding: 1px 4px; white-space: nowrap;">{{ hex8v(entry.value) }}</td>
                     <td style="padding: 1px 8px 1px 4px; color: #7b1fa2; white-space: nowrap;">{{ entry.label || '' }}</td>
                     <td style="padding: 1px 4px; color: #1a237e; white-space: nowrap;">{{ entryText(entry) }}</td>
                  </tr>
               </template>
            </table>
         </div>

         <!-- Registers table -->
         <div class="overflow-auto" style="min-width: 200px; max-width: 240px; border-left: 1px solid #e0e0e0; font-family: monospace; font-size: 0.75em;">
            <div class="px-1 pt-1">
               <v-select v-model="registerBase" :items="bases" density="compact" variant="outlined" hide-details
                  style="font-size: 0.85em;"></v-select>
            </div>
            <table style="width: 100%; border-collapse: collapse; margin-top: 4px;">
               <tr v-for="i in 32" :key="i-1">
                  <td style="padding: 1px 4px; color: #9e9e9e; white-space: nowrap;">{{ regName(i-1) }}</td>
                  <td style="padding: 1px 4px; white-space: nowrap;">{{ formatReg(registers[i-1]) }}</td>
               </tr>
            </table>
         </div>

      </div>
   </v-card>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'

import { useCRAPSAssembly } from '/src/use/useCRAPSAssembly'
import {
   add32, sub32, and32, or32, xor32, sll32, slr32,
   bin32ToUnsigned, bin32ToSigned, unsignedToBin32, signedToBin32,
   bin16ToUnsigned, bin32ToHex8, unsignedToHex8,
} from '/src/lib/binutils.js'

const { assemblies } = useCRAPSAssembly()

const props = defineProps({
   document_uid: String,
   signedinUid: String,
   user_uid: String,
   readonly: Boolean,
})

// ── State ────────────────────────────────────────────────────────────────────

const ZERO32 = '00000000000000000000000000000000'
const registers = ref(Array(32).fill(ZERO32))
const flags = ref([false, false, false, false]) // N Z V C
const memoryDict = ref({})
const baseMemory = ref(null)   // the last successfully assembled memory (for reset)
const leds = ref(Array(16).fill(false))
const switches = ref(Array(16).fill(false))
const currentAddress = ref(0)
const stopped = ref(true)
const running = ref(false)
const cycleCount = ref(0)
const errorMsg = ref(null)
const itFlipFlop = ref(0)
const breakpoints = ref(new Set())
const codeChanged = ref(false)
const sliderValue = ref(45)  // 0–100; maps quadratically → ms delay
// slider² / 20: 0→0, 20→20, 45→101, 63→198, 100→500
const stepDelay = computed(() => Math.round(sliderValue.value ** 2 / 20))
const registerBase = ref('hexadécimal')
const bases = ['hexadécimal', 'décimal signé', 'décimal non signé', 'binaire']

const hasMemory = computed(() => Object.keys(memoryDict.value).length > 0)
const inError = computed(() => errorMsg.value !== null)

// ── Assembly watcher ─────────────────────────────────────────────────────────

watch(
   () => assemblies[props.document_uid],
   (assembly) => {
      if (!assembly || assembly.errorMsg) return
      baseMemory.value = assembly.memory
      if (!hasMemory.value || stopped.value) {
         // Auto-reset when not simulating
         applyReset()
         codeChanged.value = false
      } else {
         codeChanged.value = true
      }
   },
   { immediate: true },
)

// ── Simulator core ───────────────────────────────────────────────────────────

function applyReset() {
   if (!baseMemory.value) return
   // Deep clone the assembled memory
   memoryDict.value = JSON.parse(JSON.stringify(baseMemory.value))
   registers.value = Array(32).fill(ZERO32)
   flags.value = [false, false, false, false]
   leds.value = Array(16).fill(false)
   cycleCount.value = 0
   currentAddress.value = 0
   errorMsg.value = null
   stopped.value = true
   running.value = false
   itFlipFlop.value = 0
   codeChanged.value = false
}

function reset() {
   applyReset()
}

function applyCodeChange() {
   applyReset()
}

async function runStop() {
   if (running.value) {
      running.value = false
      stopped.value = true
      return
   }
   stopped.value = false
   running.value = true
   while (running.value && !inError.value) {
      if (stepDelay.value > 0) {
         // Slow / visible mode: one step then wait
         step()
         if (breakpoints.value.has(currentAddress.value)) {
            running.value = false
            stopped.value = true
            break
         }
         await new Promise(resolve => setTimeout(resolve, stepDelay.value))
      } else {
         // Batch mode (max speed): many steps per animation frame
         for (let i = 0; i < 200 && running.value && !inError.value; i++) {
            step()
            if (breakpoints.value.has(currentAddress.value)) {
               running.value = false
               stopped.value = true
               break
            }
         }
         await new Promise(resolve => requestAnimationFrame(resolve))
      }
   }
   running.value = false
   stopped.value = true
}

function step() {
   try {
      cycleCount.value++

      if (itFlipFlop.value === 1) {
         itFlipFlop.value = 0
         // push %pc
         let sp32 = sub32(getReg(29), unsignedToBin32(1)).result
         setReg(29, sp32)
         setMemContent(bin32ToUnsigned(sp32), getReg(30))
         // push NZVC
         sp32 = sub32(getReg(29), unsignedToBin32(1)).result
         setReg(29, sp32)
         const nzvc = '0000000000000000000000000000' +
            (flags.value[0] ? '1' : '0') + (flags.value[1] ? '1' : '0') +
            (flags.value[2] ? '1' : '0') + (flags.value[3] ? '1' : '0')
         setMemContent(bin32ToUnsigned(sp32), nzvc)
         // goto address 1
         setReg(30, unsignedToBin32(1))
         gotoAddress(1)
         return
      }

      const line = memoryDict.value[currentAddress.value]
      if (!line) throw new Error(`*** exécution à l'adresse non initialisée 0x${currentAddress.value.toString(16)}`)

      setReg(31, line.value)

      if (line.instruction) {
         execInstruction(line.instruction)
      } else if (line.synthetic) {
         execSynthetic(line.synthetic)
      } else {
         throw new Error(`*** exécution à une adresse sans instruction 0x${currentAddress.value.toString(16)}`)
      }
   } catch (err) {
      errorMsg.value = err.message
      running.value = false
      stopped.value = true
   }
}

function gotoAddress(address) {
   setReg(30, unsignedToBin32(address))
   if (!memoryDict.value[address]) {
      throw new Error(`*** exécution à l'adresse non initialisée 0x${address.toString(16)}`)
   }
   currentAddress.value = address
}

function getReg(n) {
   return n === 0 ? ZERO32 : registers.value[n]
}

function setReg(n, bin32) {
   if (n > 0) registers.value[n] = bin32
}

function getMemContent(address) {
   if (address < 0x10000000) {
      const entry = memoryDict.value[address]
      if (!entry) throw new Error(`*** lecture à l'adresse non initialisée 0x${address.toString(16)}`)
      return entry.value
   } else if (address === 0x90000000) {
      // switches (read-only I/O)
      let result = ''
      for (let i = 31; i >= 0; i--) {
         result += (i < 16 && switches.value[i]) ? '1' : '0'
      }
      return result
   } else {
      throw new Error(`*** lecture à une adresse non mappée 0x${address.toString(16)}`)
   }
}

function setMemContent(address, bin32) {
   if (address < 0x10000000) {
      memoryDict.value[address] = { text: '', label: '', value: bin32 }
   } else if (address === 0xB0000000) {
      // leds (write-only I/O)
      for (let i = 0; i < 16; i++) {
         leds.value[i] = bin32.charAt(31 - i) === '1'
      }
   } else {
      throw new Error(`*** écriture à une adresse non mappée 0x${address.toString(16)}`)
   }
}

function execInstruction(instr) {
   const { type } = instr
   if (type === 'instructionBcc') {
      if (evalCond(instr.cond)) {
         gotoAddress(currentAddress.value + instr.disp)
      } else {
         gotoAddress(currentAddress.value + 1)
      }
   } else if (type === 'instructionArithLog1a') {
      const result = compute(instr.codeop, getReg(instr.rs1), getReg(instr.rs2))
      setReg(instr.rd, result)
      gotoAddress(currentAddress.value + 1)
   } else if (type === 'instructionArithLog1b') {
      const result = compute(instr.codeop, getReg(instr.rs1), signedToBin32(instr.simm13))
      setReg(instr.rd, result)
      gotoAddress(currentAddress.value + 1)
   } else if (type === 'instructionLoad1a') {
      const addr = bin32ToUnsigned(add32(getReg(instr.rs1), getReg(instr.rs2)).result)
      setReg(instr.rd, getMemContent(addr))
      gotoAddress(currentAddress.value + 1)
   } else if (type === 'instructionLoad1b') {
      const simm13 = instr.plusMinus === '-' ? -instr.simm13 : instr.simm13
      const addr = bin32ToUnsigned(add32(getReg(instr.rs1), signedToBin32(simm13)).result)
      setReg(instr.rd, getMemContent(addr))
      gotoAddress(currentAddress.value + 1)
   } else if (type === 'instructionStore1a') {
      const addr = bin32ToUnsigned(add32(getReg(instr.rs1), getReg(instr.rs2)).result)
      setMemContent(addr, getReg(instr.rd))
      gotoAddress(currentAddress.value + 1)
   } else if (type === 'instructionStore1b') {
      const simm13 = instr.plusMinus === '-' ? -instr.simm13 : instr.simm13
      const addr = bin32ToUnsigned(add32(getReg(instr.rs1), signedToBin32(simm13)).result)
      setMemContent(addr, getReg(instr.rd))
      gotoAddress(currentAddress.value + 1)
   } else if (type === 'instructionSethi') {
      const imm24 = instr.imm24.toString(2).padStart(24, '0')
      setReg(instr.rd, imm24 + '00000000')
      gotoAddress(currentAddress.value + 1)
   } else if (type === 'instructionReti') {
      // pop NZVC
      let sp32 = getReg(29)
      let sp = bin32ToUnsigned(sp32)
      const nzvc = getMemContent(sp)
      for (let i = 0; i < 4; i++) flags.value[i] = nzvc.charAt(28 + i) === '1'
      sp32 = add32(sp32, unsignedToBin32(1)).result
      setReg(29, sp32)
      // pop %pc
      sp32 = getReg(29)
      sp = bin32ToUnsigned(sp32)
      const pcBin = getMemContent(sp)
      setReg(30, pcBin)
      sp32 = add32(sp32, unsignedToBin32(1)).result
      setReg(29, sp32)
      gotoAddress(bin32ToUnsigned(pcBin))
   }
}

function execSynthetic(syn) {
   const { type } = syn
   if (type === 'clr') {
      setReg(syn.rd, ZERO32)
      gotoAddress(currentAddress.value + 1)
   } else if (type === 'mov') {
      setReg(syn.rd, getReg(syn.rs))
      gotoAddress(currentAddress.value + 1)
   } else if (type === 'inc') {
      setReg(syn.rd, signedToBin32(bin32ToSigned(getReg(syn.rd)) + 1))
      gotoAddress(currentAddress.value + 1)
   } else if (type === 'inccc') {
      const v = bin32ToSigned(getReg(syn.rd))
      const r = v + 1
      setReg(syn.rd, signedToBin32(r))
      setFlag(0, r < 0); setFlag(1, r === 0)
      setFlag(2, v === 2147483647); setFlag(3, (v & 0xFFFFFFFF) === 0xFFFFFFFF)
      gotoAddress(currentAddress.value + 1)
   } else if (type === 'dec') {
      setReg(syn.rd, signedToBin32(bin32ToSigned(getReg(syn.rd)) - 1))
      gotoAddress(currentAddress.value + 1)
   } else if (type === 'deccc') {
      const v = bin32ToSigned(getReg(syn.rd))
      const r = v - 1
      setReg(syn.rd, signedToBin32(r))
      setFlag(0, r < 0); setFlag(1, r === 0)
      setFlag(2, v === -2147483648); setFlag(3, v === 0)
      gotoAddress(currentAddress.value + 1)
   } else if (type === 'setq') {
      setReg(syn.rd, signedToBin32(syn.simm13))
      gotoAddress(currentAddress.value + 1)
   } else if (type === 'set') {
      setReg(syn.rd, signedToBin32(syn.simm32))
      gotoAddress(currentAddress.value + 2)
   } else if (type === 'cmp') {
      const rs = bin32ToSigned(getReg(syn.rs))
      const rsU = bin32ToUnsigned(getReg(syn.rs))
      if (syn.rd !== undefined) {
         const rd = bin32ToSigned(getReg(syn.rd))
         const rdU = bin32ToUnsigned(getReg(syn.rd))
         const diff = rs - rd
         setFlag(0, diff < 0); setFlag(1, diff === 0)
         setFlag(2, (rs < 0 && rd >= 0 && diff >= 0) || (rs >= 0 && rd < 0 && diff < 0))
         setFlag(3, rsU < rdU)
      } else {
         const diff = rs - syn.simm13
         setFlag(0, diff < 0); setFlag(1, diff === 0)
         setFlag(2, (rs < 0 && syn.simm13 >= 0 && diff >= 0) || (rs >= 0 && syn.simm13 < 0 && diff < 0))
         setFlag(3, diff < 0)
      }
      gotoAddress(currentAddress.value + 1)
   } else if (type === 'tst') {
      const rs = bin32ToSigned(getReg(syn.rs))
      setFlag(0, rs < 0); setFlag(1, rs === 0); setFlag(2, false); setFlag(3, false)
      gotoAddress(currentAddress.value + 1)
   } else if (type === 'negcc') {
      const v = bin32ToSigned(getReg(syn.rd))
      setReg(syn.rd, signedToBin32(-v))
      setFlag(0, -v < 0); setFlag(1, v === 0); setFlag(2, false); setFlag(3, false)
      gotoAddress(currentAddress.value + 1)
   } else if (type === 'nop') {
      gotoAddress(currentAddress.value + 1)
   } else if (type === 'call') {
      setReg(28, getReg(30))
      gotoAddress(currentAddress.value + syn.disp + 1)
   } else if (type === 'ret') {
      const r28 = bin32ToUnsigned(getReg(28))
      gotoAddress(r28 + 2)
   } else if (type === 'push') {
      let sp32 = sub32(getReg(29), unsignedToBin32(1)).result
      setReg(29, sp32)
      setMemContent(bin32ToUnsigned(sp32), getReg(syn.rs))
      gotoAddress(currentAddress.value + 2)
   } else if (type === 'pop') {
      const sp32 = getReg(29)
      setReg(syn.rd, getMemContent(bin32ToUnsigned(sp32)))
      setReg(29, add32(sp32, unsignedToBin32(1)).result)
      gotoAddress(currentAddress.value + 2)
   }
}

function compute(codeop, a, b) {
   if (codeop === 'add' || codeop === 'addcc') {
      const { result, V, C } = add32(a, b)
      if (codeop === 'addcc') {
         setFlag(0, result.charAt(0) === '1')
         setFlag(1, !result.includes('1'))
         setFlag(2, V); setFlag(3, C)
      }
      return result
   } else if (codeop === 'sub' || codeop === 'subcc') {
      const { result, V, C } = sub32(a, b)
      if (codeop === 'subcc') {
         setFlag(0, result.charAt(0) === '1')
         setFlag(1, !result.includes('1'))
         setFlag(2, V); setFlag(3, C)
      }
      return result
   } else if (codeop === 'umulcc') {
      const v1 = bin16ToUnsigned(a.substring(16))
      const v2 = bin16ToUnsigned(b.substring(16))
      const result = unsignedToBin32(v1 * v2)
      setFlag(0, result.charAt(0) === '1')
      setFlag(1, !result.includes('1'))
      return result
   } else if (codeop === 'and' || codeop === 'andcc') {
      const result = and32(a, b)
      if (codeop === 'andcc') { setFlag(0, result.charAt(0) === '1'); setFlag(1, !result.includes('1')) }
      return result
   } else if (codeop === 'or' || codeop === 'orcc') {
      const result = or32(a, b)
      if (codeop === 'orcc') { setFlag(0, result.charAt(0) === '1'); setFlag(1, !result.includes('1')) }
      return result
   } else if (codeop === 'xor' || codeop === 'xorcc') {
      const result = xor32(a, b)
      if (codeop === 'xorcc') { setFlag(0, result.charAt(0) === '1'); setFlag(1, !result.includes('1')) }
      return result
   } else if (codeop === 'sll') {
      return sll32(a, b)
   } else if (codeop === 'slr') {
      return slr32(a, b)
   }
   return ZERO32
}

function setFlag(i, v) {
   flags.value[i] = v
}

function evalCond(cond) {
   const [N, Z, V, C] = flags.value
   switch (cond) {
      case 'a':   return true
      case 'z': case 'e': case 'eq': return Z
      case 'nz': case 'ne':          return !Z
      case 'neg': case 'n':          return N
      case 'pos': case 'nn':         return !N
      case 'cs': case 'lu':          return C
      case 'cc': case 'geu':         return !C
      case 'vs':                     return V
      case 'vc':                     return !V
      case 'g': case 'gt':           return !(Z || (N !== V))
      case 'ge':                     return N === V
      case 'l': case 'lt':           return N !== V
      case 'le':                     return Z || (N !== V)
      case 'gu':                     return !(Z || C)
      case 'leu':                    return Z || C
      default:                       return false
   }
}

function sendIT() {
   itFlipFlop.value = 1
}

function toggleSwitch(i) {
   switches.value[i] = !switches.value[i]
}

function toggleBreakpoint(address) {
   const bp = new Set(breakpoints.value)
   if (bp.has(address)) bp.delete(address)
   else bp.add(address)
   breakpoints.value = bp
}

// ── Memory display ────────────────────────────────────────────────────────────

const memoryEntries = computed(() => {
   const raw = Object.entries(memoryDict.value)
      .map(([addr, entry]) => ({ address: parseInt(addr), ...entry }))
      .sort((a, b) => a.address - b.address)
   const result = []
   let sepKey = 0
   for (let i = 0; i < raw.length; i++) {
      if (i > 0 && raw[i].address > raw[i - 1].address + 1) {
         result.push({ separator: true, sepKey: sepKey++ })
      }
      result.push(raw[i])
   }
   return result
})

// Scroll current address into view
watch(currentAddress, (addr) => {
   nextTick(() => {
      document.getElementById('memrow-' + addr)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
   })
})

function hex8(address) {
   return unsignedToHex8(address)
}

function hex8v(bin32) {
   return bin32ToHex8(bin32)
}

function entryText(entry) {
   if (entry.instruction) return entry.instruction.text
   if (entry.synthetic) return entry.synthetic.text
   return ''
}

// ── Register display ─────────────────────────────────────────────────────────

const REG_NAMES = [
   '%r0', '%r1', '%r2', '%r3', '%r4', '%r5', '%r6', '%r7',
   '%r8', '%r9', '%r10', '%r11', '%r12', '%r13', '%r14', '%r15',
   '%r16', '%r17', '%r18', '%r19', '%r20', '%r21', '%r22', '%r23',
   '%r24', '%r25', '%r26', '%r27', '%fp', '%sp', '%pc', '%ir',
]

function regName(i) {
   return REG_NAMES[i]
}

function formatReg(bin32) {
   if (!bin32) return '00000000'
   switch (registerBase.value) {
      case 'hexadécimal':       return bin32ToHex8(bin32)
      case 'décimal signé':     return String(bin32ToSigned(bin32))
      case 'décimal non signé': return String(bin32ToUnsigned(bin32))
      case 'binaire':           return bin32
      default:                  return bin32ToHex8(bin32)
   }
}
</script>
