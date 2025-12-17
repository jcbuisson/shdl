<template>
   <!-- <div>document {{ document }}</div> -->

   <!-- makes the layout a vertical stack filling the full height -->
   <v-card class="d-flex flex-column fill-height"
      v-if="module?.is_valid">

      <!-- Test selector (does not grow) -->
      <div class="px-2">
         <v-select
            v-model="selectedTest"
            @update:modelValue="() => selectedTest && initTest()"
            :items="isTeacher ? testList : sortedTestList"
            item-title="name"
            :item-value="test => test"
            label="Choisir un test"
            clearable
            persistent-hint
            variant="underlined"
         ></v-select>
      </div>

      <!-- Toolbar (does not grow) -->
      <div v-if="!!selectedTest" class="d-flex align-center flex-wrap justify-space-between px-2">
         <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            {{ testCurrentLine }}
         </div>

         <v-sheet color="grey-lighten-4" rounded>
            <v-btn icon="mdi-play" variant="text" :disabled="testStatusCode >= 2" @click="runTest"></v-btn>
            <v-btn icon="mdi-debug-step-over" variant="text" :disabled="testStatusCode >= 2" @click="stepTest"></v-btn>
            <v-btn icon="mdi-replay" variant="text" @click="initTest"></v-btn>
         </v-sheet>
      </div>

      <div v-if="!!selectedTest && testStatusCode >= 2" :style="{ backgroundColor: testStatusCode === 3 ? '#E15241' : '#67AD5B' }" style="color: white; height: 40px; padding: 10px;">
         <h5>{{ testStatusText }}</h5>
      </div>

      <!-- Fills remaining vertical space -->
      <div class="overflow-auto">
         <v-list density="compact">
            <template v-for="signalGroup in parameterGroups">
               <v-list-item>
                  <template v-slot:prepend>
                     <v-icon size="small" :color="inputOutputIconColor(signalGroup)" v-if="signalGroup.isInput || signalGroup.isOutput" @click="clear(signalGroup)">
                        {{ inputOutputIcon(signalGroup) }}
                     </v-icon>
                  </template>
                  <v-list-item-title>
                     {{ signalGroup.name }}
                  </v-list-item-title>
                  <template v-slot:append>
                     <div>
                        <template v-for="index in signalGroup.equipotentialIndexes">
                           <v-icon size="small" @click="onIconClick(index)" :disabled="!signalGroup.isInput">{{ checkIcon(index, signalGroup.isInput) }}</v-icon>
                        </template>
                     </div>
                  </template>
               </v-list-item>
            </template>
         </v-list>

         <template v-if="otherGroups.length > 0">
            <v-divider :thickness="3"/>
            <v-list density="compact">
               <template v-for="signalGroup in otherGroups">
                  <v-list-item>
                  <template v-slot:prepend>
                     <v-icon size="small"></v-icon>
                  </template>
                     <v-list-item-title>
                        {{ signalGroup.name }}
                     </v-list-item-title>
                     <template v-slot:append>
                        <div>
                           <template v-for="index in signalGroup.equipotentialIndexes">
                              <v-icon size="small" disabled>{{ checkIcon(index, false) }}</v-icon>
                           </template>
                        </div>
                     </template>
                  </v-list-item>
               </template>
            </v-list>
         </template>
      </div>
   </v-card>
</template>


<script setup>
import { watch, onUnmounted, computed, ref } from 'vue'
import { useIntervalFn } from '@vueuse/core'

import { parameterArity, parameterNameAtIndex } from '/src/lib/shdl/shdlUtilities.js'
import { strToBin } from '/src/lib/binutils.js'

import useExpressXClient from '/src/use/useExpressXClient';

import { useSHDLModule } from '/src/use/useSHDLModule'

import { useSHDLTest } from '/src/use/useSHDLTest'
import { useUserSHDLTestRelation } from '/src/use/useUserSHDLTestRelation'
import { useBusinessObservables } from '/src/use/useBusinessObservables'

import { peg$parse as testLineParse } from '/src/lib/shdl/shdl_test_line_parser.js'
import { useObservable } from '@vueuse/rxjs'

const { module$ } = useSHDLModule()

const { app } = useExpressXClient();
const { getObservable: tests$ } = useSHDLTest(app)

const { create: createUserTestRelation, update: updateUserTestRelation } = useUserSHDLTestRelation(app)
const { userSlots$, isTeacher$, userSHDLTests$, userGroupSlotSHDLTestRelation$, userSHDLTestsRelations$, userDocument$ } = useBusinessObservables(app)


const props = defineProps({
   signedinUid: String,
   user_uid: String,
   document_uid: String,
})

const document = useObservable(userDocument$(props.document_uid))
const module = ref()
const previousValues = ref(null)
const currentValues = ref(null)

const currentTime = ref((new Date()).toISOString())
useIntervalFn(() => currentTime.value = (new Date()).toISOString(), 60000, { immediate: true }) // useIntervalFn automatically takes care of cleaning on dispose

const userSlots = useObservable(userSlots$(props.user_uid))
const isTeacher = useObservable(isTeacher$(props.signedinUid))

const testList = useObservable(tests$())
const userTestList = useObservable(userSHDLTests$(props.user_uid))
const testRelationList = useObservable(userGroupSlotSHDLTestRelation$(props.user_uid))

// every time 'currentTime' changes, this computed is re-evaluated, without running a new 'where' clause
const filteredTestList = computed(() => {
   if (!currentTime.value || !userSlots.value || !userTestList.value) return []
   // filter user slots compatible with 'currentTime'
   const slotUIDs = userSlots.value.filter(slot => slot.start <= currentTime.value && slot.end >= currentTime.value).map(slot => slot.uid)
   // get associated tests using already loaded user test relation list and test list
   const testUIDs = testRelationList.value.filter(relation => slotUIDs.includes(relation.group_slot_uid)).map(relation => relation.shdl_test_uid)
   return testUIDs.map(testUID => userTestList.value.find(test => test.uid === testUID))
})
const sortedTestList = computed(() => filteredTestList.value ? filteredTestList.value.sort((u1, u2) => (u1.name > u2.name) ? 1 : (u1.name < u2.name) ? -1 : 0) : [])


const selectedTest = ref()

const userTestRelations = useObservable(userSHDLTestsRelations$(props.user_uid))

let subscription

watch(() => props.document_uid, async (document_uid) => {
   if (subscription) subscription.unsubscribe()
   subscription = module$(document_uid).subscribe({
      next: module_ => {
         console.log('next simu', module_, module.value);
         if (!module.value || !module_.structure) {
            console.log('NEXT simu', module_);
            selectedTest.value = null;
            if (module_?.structure) {
               module.value = module_;
               initializeEquipotentials(module_);
               let error = updateState();
               if (error) {
                  testStatusCode.value = 3;
                  testStatusText.value = error;
               }
            } else {
               module.value = null;
            }
         }
      },
      error: err => {
         module.value = null;
         console.log('err33', err);
      },
   })
}, { immediate: true })

onUnmounted(() => {
   if (subscription) subscription.unsubscribe()
})

const structure = computed(() => {
   return module?.value?.structure
})

const equipotentials = computed(() => {
   return module?.value?.equipotentials
})

function initializeEquipotentials(module) {
   previousValues.value = module.equipotentials.map(_ => null)
   currentValues.value = module.equipotentials.map(_ => null)
}

const parameterGroups = computed(() => {
   if (!structure.value || !equipotentials.value) return []
   // build homogeneous groups in terms of input/output
   let groups = []
   for (let i = 0; i < structure.value.params.length; i++) {
      let parameter = structure.value.params[i]
      if (parameter.type === 'scalar') {
         // each scalar has its own group
         let equipotentialIndex = equipotentials.value["__" + parameter.name]
         let equipotential = equipotentials.value[equipotentialIndex]
         groups.push({
            name: parameter.name,
            isInput: equipotential.isInput,
            isOutput: equipotential.isOutput,
            equipotentialIndexes: [equipotentialIndex]
         })
      } else {
         // a vector parameter may result in several groups
         let firstIndex
         let firstSignalName
         let firstEquipotential
         let equipotentialIndexes
         let reset = true
         let paramArity = parameterArity(parameter)
         let j
         for (j = 0; j < paramArity; j++) {
            let signalName = parameterNameAtIndex(parameter, j)
            let equipotentialIndex = equipotentials.value["__" + signalName]
            let equipotential = equipotentials.value[equipotentialIndex]
            if (reset) {
               firstIndex = parameter.start - j
               firstSignalName = parameterNameAtIndex(parameter, j)
               firstEquipotential = equipotentials.value[equipotentials.value["__" + firstSignalName]]
               equipotentialIndexes = []
               reset = false
            }
            if (equipotential.isInput && firstEquipotential.isInput || equipotential.isOutput && firstEquipotential.isOutput) {
               equipotentialIndexes.push(equipotentialIndex)
            } else {
               groups.push({
                  name: `${parameter.name}[${firstIndex}..${parameter.start - j + 1}]`,
                  isInput: firstEquipotential.isInput,
                  isOutput: firstEquipotential.isOutput,
                  equipotentialIndexes: equipotentialIndexes,
               })
               reset = true
            }
         }
         if (equipotentialIndexes.length > 0) {
            groups.push({
               name: `${parameter.name}[${firstIndex}:${parameter.start - j + 1}]`,
               isInput: firstEquipotential.isInput,
               isOutput: firstEquipotential.isOutput,
               equipotentialIndexes: equipotentialIndexes,
            })
         }
      }
   }
   return groups
})

const otherGroups = computed(() => {
   if (!structure.value) return []
   // collect all remaining equipotentials
   let otherEquipotentials = equipotentials.value.filter(function(equipotential) {
      if (equipotential === undefined) return false // alias empty slot
      if (equipotential.name === null) return false
      if (equipotential.isInput) return false
      if (equipotential.isOutput) return false
      return true
   })
   // sort them by name in descending order, then by decreasing indexes for vectors
   otherEquipotentials.sort(function(a, b) {
      if (a.name < b.name) return 1
      if (a.name > b.name) return -1
      return 0
   })
   otherEquipotentials.sort(function(a, b) {
      let ai = a.name.indexOf('[')
      let bi = a.name.indexOf('[')
      let aPrefix = ai === -1 ? a.name : a.name.substring(0, ai)
      let bPrefix = bi === -1 ? b.name : b.name.substring(0, bi)
      if (aPrefix < bPrefix) return 1
      if (aPrefix > bPrefix) return -1
      // same prefix
      if (ai === -1) return 0
      // extract last index for a, first index for b
      let aj = a.name.indexOf('..')
      let ak = a.name.indexOf(']')
      let aLastIndex = parseInt(a.name.substring((aj === -1 ? ai+1 : aj+2), ak))
      let bj = b.name.indexOf('..')
      let bk = b.name.indexOf(']')
      let bFirstIndex = parseInt(b.name.substring(bi+1, (bj === -1 ? bk : bj)))
      if (aLastIndex < bFirstIndex) return 1
      if (aLastIndex > bFirstIndex) return -1
      return 0
   })

   // make groups by name prefix and consecutive indexes
   let currentPrefix = null
   let startIndex = null
   let stopIndex = null
   let equipotentialIndexes = null
   let groups = []
   for (let i = 0; i < otherEquipotentials.length; i++) {
      let equipotential = otherEquipotentials[i]
      let x = equipotential.name.indexOf('[')
      if (x === -1) {
         // scalar
         if (currentPrefix !== null) {
            // flush current group
            let range = startIndex === stopIndex ? `${startIndex}` : `${startIndex}:${stopIndex}`
            groups.push({
               name: `${currentPrefix}[${range}]`,
               equipotentialIndexes: equipotentialIndexes,
            })
         }
         // a scalar has its own group
         groups.push({
            name: equipotential.name,
            equipotentialIndexes: [equipotential.index]
         })
         currentPrefix = null
      } else {
         // vector
         let prefix = equipotential.name.substring(0, x)
         let index = parseInt(equipotential.name.substring(x + 1, equipotential.name.length - 1))
         if (currentPrefix === null) {
            // start new group
            currentPrefix = prefix
            startIndex = index
            stopIndex = index
            equipotentialIndexes = [equipotential.index]
         } else if (prefix == currentPrefix) {
            if (index === stopIndex - 1) {
               // next consecutive index: continues current group
               stopIndex = index
               equipotentialIndexes.push(equipotential.index)
            } else {
               // same name prefix, but break in indexes: flush current group
               let range = startIndex === stopIndex ? `${startIndex}` : `${startIndex}:${stopIndex}`
               groups.push({
                  name: `${currentPrefix}[${range}]`,
                  equipotentialIndexes: equipotentialIndexes,
               })
               // start new group
               currentPrefix = prefix
               startIndex = index
               stopIndex = index
               equipotentialIndexes = [equipotential.index]
            }
         } else {
            // change of name prefix: flush current group
            groups.push({
               name: `${currentPrefix}[${startIndex}:${stopIndex}]`,
               equipotentialIndexes: equipotentialIndexes,
            })
            // start new group
            currentPrefix = prefix
            startIndex = index
            stopIndex = index
            equipotentialIndexes = [equipotential.index]
         }
         if (i === otherEquipotentials.length -1 && currentPrefix !== null) {
            // flush current group
            let range = startIndex === stopIndex ? `${startIndex}` : `${startIndex}:${stopIndex}`
            groups.push({
               name: `${currentPrefix}[${range}]`,
               equipotentialIndexes: equipotentialIndexes,
            })
         }
      }

   }
   return groups
})


function inputOutputIcon(signalGroup) {
   if (signalGroup.isInput) {
      return 'mdi-arrow-right-thin'
   } else if (signalGroup.isOutput) {
      return 'mdi-arrow-left-thin'
   } else {
      return null
   }
}

function inputOutputIconColor(signalGroup) {
   if (signalGroup.isInput) {
      return 'pink'
   } else if (signalGroup.isOutput) {
      return 'green'
   } else {
      return null
   }
}

function checkIcon(index, isInput) {
   if (currentValues.value[index] === null) {
      return isInput ? 'mdi-minus-box' : 'mdi-minus-circle'
   } else if (currentValues.value[index]) {
      return isInput ? 'mdi-checkbox-marked' : 'mdi-radiobox-marked'
   } else {
      return isInput ? 'mdi-checkbox-blank-outline' : 'mdi-radiobox-blank'
   }
}

function onIconClick(index) {
   if (currentValues.value[index] === null) {
      currentValues.value[index] = false
   } else {
      currentValues.value[index] = !currentValues.value[index]
   }
   let error = updateState()
   if (error) {
      testStatusCode.value = 3
      testStatusText.value = error
   }
}

function clear(signalGroup) {
   if (!signalGroup.isInput) return
   let first = currentValues.value[signalGroup.equipotentialIndexes[0]]
   let toggled = (first === null) ? false : (first ? null : true)
   signalGroup.equipotentialIndexes.forEach(function(index) {
      currentValues.value[index] = toggled
   })
   // propagate changes
   let error = updateState()
   if (error) {
      testStatusCode.value = 3
      testStatusText.value = error
   }
}

function updateState() {
   // TO IMPROVE : ALL EQUIPOTENTIALS ARE REEVALUATED AT EACH CYCLE
   // USE 'uses' ATTRIBUTE TO ONLY UPDATE WHEN NECESSARY
   let change = true
   let cycles = 0
   let error = ''
   while (change && cycles < 100) {
      // evaluation cycle
      change = false
      let nextValues = []
      // plain loop is used because we need to break
      for (let index = 0; index < equipotentials.value.length; index++) {
         let equipotential = equipotentials.value[index]
         if (equipotential === undefined) continue // alias empty slot
         if (equipotential.isInput) continue
         
         let previousValue = currentValues.value[index]
         let value = equipotentialValue(index, currentValues.value, previousValues.value)
         change = change | (value != previousValue)
         nextValues[index] = value
      }
      // update dataArray all at once (not one by one) for the next evaluation cycle
      for (let index = 0; index < equipotentials.value.length; index++) {
         previousValues.value[index] = currentValues.value[index]
         let equipotential = equipotentials.value[index]
         if (equipotential === undefined) continue // alias empty slot
         if (equipotential.isInput) continue
         currentValues.value[index] = nextValues[index]
      }
      cycles += 1
   }
   // now that propagation has stabilized, check for tri-state short-circuits
   // plain loop is used because we need to break
   for (let index = 0; index < equipotentials.value.length; index++) {
      let equipotential = equipotentials.value[index]
      if (equipotential === undefined) continue // alias empty slot
      if (equipotential.type !== 'tri-state') continue

      let outputEnableValues = equipotential.sources.map(source => currentValues.value[source.oeEquipotential])
      let indexes = outputEnableValues.reduce((accu, value, index) => value === true ? [index].concat(accu) : accu, [])
      if (indexes.length > 1) {
         let conflicting_sources = indexes.map(index => equipotential.sources[index])
         let conflictNames = conflicting_sources.map(src => {
            let srcText = equipotentials.value[src.srcEquipotential].name || "<anonymous equipotential>"
            let oeText = equipotentials.value[src.oeEquipotential].name || "<anonymous equipotential>"
            return `${srcText}:${oeText}`
         })
         error = `*** short-circuit on ${equipotential.name} between: ${conflictNames.join(' and ')}`
         break
      }
   }
   return error
}

// return false (0), true (1) or null (indeterminate or short-circuit)
function equipotentialValue(equipotentialIndex, dataArray, previousValueArray) {
   if (dataArray === null) return null
   let equipotential = equipotentials.value[equipotentialIndex]
   if (equipotential === undefined) {
      equipotential = equipotential
   }
   if (equipotential.isInput) {
      return dataArray[equipotentialIndex]

   } else if (equipotential.type === 'constant') {
      // return equipotential.name === '>1' ? true : false
      return equipotential.cvalue === 1 ? true : equipotential.cvalue === 0 ? false : null

   } else if (equipotential.type === 'combinatorial') {
      return evaluateFormula(equipotential.formula, dataArray)

   } else if (equipotential.type === 'tri-state') {
      let outputEnableValues = equipotential.sources.map(source =>
         dataArray[source.oeEquipotential]
      )
      let indexes = outputEnableValues.reduce((accu, value, index) => value === true ? [index].concat(accu) : accu, [])
      if (indexes.length === 0) {
         // no output enable is true -> indeterminate
         return null
      }
      if (indexes.length === 1) {
         return dataArray[equipotential.sources[indexes[0]].srcEquipotential]
      }
      // short-circuit: return null
      // Short-circuits do not break simulation during propagation instabilities
      // They are checked again when progation has stabilized (see updateState())
      return null

   } else if (equipotential.type === 'sequential') {
      if (equipotential.rst !== undefined) {
         //let resetValue = equipotentialValue(equipotential.rst, dataArray, previousValueArray)
         let resetValue = dataArray[equipotential.rst]
         if (resetValue === true) {
            // reset exists and is on
            return false
         }
      }
      if (equipotential.set !== undefined) {
         //let setValue = equipotentialValue(equipotential.set, dataArray, previousValueArray)
         let setValue = dataArray[equipotential.set]
         if (setValue === true) {
            // set exists and is on
            return true
         }
      }
      if (equipotential.en !== undefined) {
         //let enValue = equipotentialValue(equipotential.en, dataArray, previousValueArray)
         let enValue = dataArray[equipotential.en]
         if (enValue === false) {
            // enable exists and is false -> return current value (no change)
            return dataArray[equipotentialIndex]
         }
      }
      // no reset & no enable or enable true -> check clock tick
      let previousClkValue = previousValueArray[equipotential.clk]
      let currentClkValue = dataArray[equipotential.clk]
      if (previousClkValue === false && currentClkValue === true) {
         // rising edge on clock -> return computed value
         return evaluateFormula(equipotential.formula, dataArray)
      } else {
         // no clock tick: keep current value
         return dataArray[equipotentialIndex]
      }

   } else if (equipotential.type === 'rom' || equipotential.type === 'ram_aread_swrite') {
      let addressKey = equipotential.addrs.map(equipotentialIndex => {
         return dataArray[equipotentialIndex]
      }).join()
      if (equipotential.type === 'ram_aread_swrite') {
         // check clock tick & wr
         let previousClkValue = previousValueArray[equipotential.clk]
         let currentClkValue = dataArray[equipotential.clk]
         let currentWrValue = dataArray[equipotential.wr]
         if (previousClkValue === false && currentClkValue === true && currentWrValue === true) {
            // rising edge on clock + write -> store din value in dict
            equipotential.dict[addressKey] = dataArray[equipotential.din]
         }
      }
      // in all cases return current dict value
      let value = equipotential.dict[addressKey]
      return value === undefined ? null : value
   }
   return null
}

function evaluateFormula(formula, dataArray) {
   if (formula.op === 'or') {
      let one = formula.args.some(function(f) {
         return (evaluateFormula(f, dataArray) === true)
      })
      if (one) {
         return true
      }
      let zero = formula.args.every(function(f) {
         return (evaluateFormula(f, dataArray) === false)
      })
      if (zero) {
         return false
      }
      // indeterminate
      return null
   } else if (formula.op === 'and') {
      let zero = formula.args.some(function(f) {
         return (evaluateFormula(f, dataArray) === false)
      })
      if (zero) {
         return false
      }
      let one = formula.args.every(function(f) {
         return (evaluateFormula(f, dataArray) === true)
      })
      if (one) {
         return true
      }
      // indeterminate
      return null
   } else if (formula.op === 'maxterm') {
      let value = dataArray[formula.equipotentialIndex]
      if (value === null) {
         return null
      } else {
         if (formula.inverted) value = !value
         return value
      }
   } else if (formula.op === 'expr') {
      // return equipotentialValue(formula.equipotentialIndex, dataArray, null)
      return dataArray[formula.equipotentialIndex]
   } else {
      // constant
      if (formula === '0') {
         return false
      } else if (formula === '1') {
         return true
      } else {
         return null
      }
   }
}

////////////////////////////        TEST        ////////////////////////////

const testStatusCode = ref(0) // 0: closed, 1: open but not started, 2: started & ok, 3: started & KO
const testStatusText = ref()
const testCurrentLineNo = ref(0)
const testStatementList = ref()

const testCurrentLine = computed(() => {
   if (testStatementList.value.length === 0) return ''
   const currentStatement = testStatementList.value[testCurrentLineNo.value]
   // const truncatedStatement = currentStatement.slice(0, 40) + (currentStatement.length > 40 ? '...' : '')
   // return `${testCurrentLineNo.value + 1}/${testStatementList.value.length} - ${truncatedStatement}`
   return `${testCurrentLineNo.value + 1}/${testStatementList.value.length} - ${currentStatement}`
})

function delay(ms) {
   return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
   while (testStatusCode.value < 2) {
      await stepTest();
      await delay(50);
   }
}

function initTest() {
   // (re)initialize equipotentials
   initializeEquipotentials(module.value);
   // load memory
   if (selectedTest.value.memory_contents) {
      loadMemContents(selectedTest.value.memory_contents)
   }
   // load statements
   testStatementList.value = selectedTest.value.test_statements ? selectedTest.value.test_statements.split(/\r?\n/) : [];
   testStatusCode.value = 0
   testCurrentLineNo.value = 0
}

async function stepTest() {
   if (testStatusCode.value >= 2) return // should not happen

   // execute current line
   const currentStatement = testStatementList.value[testCurrentLineNo.value]
   let error = executeLine(currentStatement)

   if (!error) {
      // propagate changes
      error = updateState()
   }

   const now = new Date();
   if (error) {
      testStatusCode.value = 3
      testStatusText.value = error

      // store failed test result
      if (!isTeacher.value) {
         const previousTest = userTestRelations.value.find(testRelation => testRelation.shdl_test_uid === selectedTest.value.uid)
         if (previousTest) {
            await updateUserTestRelation(previousTest.uid, {
               last_try_date: now,
            })
         } else {
            await createUserTestRelation({
               user_uid: props.user_uid,
               shdl_test_uid: selectedTest.value.uid,
               first_try_date: now,
               last_try_date: now,
            })
         }
      }
   } else {
      if (testCurrentLineNo.value < testStatementList.value.length - 1) {
         // test is not over yet
         testCurrentLineNo.value += 1
      } else {
         // test is over: success!
         testStatusCode.value = 2
         testStatusText.value = "SUCCÈS !"
         // store success test result
         if (!isTeacher.value) {
            const previousTest = userTestRelations.value.find(testRelation => testRelation.shdl_test_uid === selectedTest.value.uid)
            if (previousTest) {
               await updateUserTestRelation(previousTest.uid, {
                  last_try_date: now,
                  success_date: now,
                  update_count: document.update_count,
               })
            } else {
               await createUserTestRelation({
                  user_uid: props.user_uid,
                  shdl_test_uid: selectedTest.value.uid,
                  first_try_date: now,
                  last_try_date: now,
                  success_date: now,
                  update_count: document.value.update_count,
               })
            }
         }
      }
   }
}

function executeLine(line) {
   if (!line || line.trim().length === 0) return ''
   try {
      // parse line
      let command = testLineParse(line)
      if (command.cmd === 'comment') return ''
      if (command.signal.type === 'scalar') {
         if (command.value.length !== 1) {
            return "Erreur d'arité"
         }
         let signalName = command.signal.name
         let equipotentialIndex = equipotentials.value["__" + signalName]
         if (equipotentialIndex === undefined) {
            return `Nom de signal inconnu : ${signalName}`
         }
         let value = command.value === '0' ? false : command.value === '1' ? true : null
         if (command.cmd === 'set') {
            currentValues.value[equipotentialIndex] = value
         } else if (command.cmd === 'check') {
            let currentValue = currentValues.value[equipotentialIndex]
            if (currentValue !== value) {
               return `Attendu ${signalName} = ${command.value}`
            }
         }
      } if (command.signal.type === 'vector') {
         let vectorSize = command.signal.start - command.signal.stop + 1
         if (vectorSize !== command.value.length) {
            return "Erreur d'arité"
         }
         for (let index = command.signal.start; index >= command.signal.stop; index--) {
            let signalName = `${command.signal.name}[${index}]`
            let equipotentialIndex = equipotentials.value["__" + signalName]
            if (equipotentialIndex === undefined) {
               return `Nom de" signal inconnu : ${signalName}`
            }
            let i = command.signal.start - index
            let value = command.value[i] === '0' ? false : command.value[i] === '1' ? true : null
            if (command.cmd === 'set') {
               currentValues.value[equipotentialIndex] = value
            } else if (command.cmd === 'check') {
               let currentValue = currentValues.value[equipotentialIndex]
               if (currentValue !== value) {
                  return `Attendu ${signalName} = ${command.value[i]}`
               }
            }
         }
      }
      return ''
   } catch(err) {
      return "*** erreur de syntaxe ***"
   }
}

// function onMemFileChange(e) {
//    var files = e.target.files || e.dataTransfer.files
//    if (!files.length) return

//    var reader = new FileReader()
//    reader.onload = (e) => {
//       let memContent = e.target.result
//       loadMemContents(memContent)
//       updateState()
//    }
//    reader.readAsText(files[0])
// }

function getMemoryInstanceArray() {
   let memoryEquipotentials = equipotentials.value.filter(function(equipotential) {
      if (equipotential.type === 'rom') return true
      if (equipotential.type === 'ram_aread_swrite') return true
   })
   let memoryInstanceArray = []
   memoryEquipotentials.forEach(equipotential => {
      if (memoryInstanceArray[equipotential.memUUID] === undefined) memoryInstanceArray[equipotential.memUUID] = []
      memoryInstanceArray[equipotential.memUUID][equipotential.memOutIndex] = equipotential
   })
   return memoryInstanceArray
}

function loadMemContents(memoryFileContent) {
   testStatusCode.value = 2
   let memoryContentArray
   try {
      memoryContentArray = JSON.parse(memoryFileContent)
   } catch(err) {
      testStatusCode.value = 3
      testStatusText.value = "JSON syntax error"
      return
   }
   let memoryInstanceArray = getMemoryInstanceArray()
   if (memoryInstanceArray.length != memoryContentArray.length) {
      testStatusCode.value = 3
      testStatusText.value = "Wrong number of memory initialization blocks"
      return
   }

   memoryContentArray.forEach((memoryContent, memoryIndex) => {
      // look for memory equipotentials
      let memEquipotentials = memoryInstanceArray[memoryIndex]
      // check arities
      for (let addr in memoryContent) {
         let addrLength = memEquipotentials[0].addrs.length
         let dataLength = memEquipotentials.length
         let addrArray = strToBin(addr, addrLength)
         let dataArray = strToBin(memoryContent[addr], dataLength)
         if (dataArray.length !== dataLength || addr.length !== addrLength) {
            testStatusCode.value = 3
            testStatusText.value = `arity issue for ${addr} : ${memoryContent[addr]}`
            break
         }
         // fill memory
         let status = loadMemLine(addr, dataArray, memEquipotentials)
         if (status.length > 0) {
            testStatusCode.value = 3
            testStatusText.value = status
            break
         }
      }
   })
   if (testStatusCode.value === 2) {
      testStatusText.value = "MEMORY LOADED"
   }
}


function loadMemLine(addr, dataArray, memEquipotentials) {
   for (let i = 0; i < addr.length; i++) {
      if (addr[i] !== '0' && addr[i] !== '1') {
         return 'ADDRESS ISSUE'
      }
   }
   let arity = memEquipotentials.length
   for (let i = 0; i < arity; i++) {
      let equipotential = memEquipotentials[i]
      let value = dataArray[arity - equipotential.memOutIndex - 1]
      if (value !== '0' && value !== '1') {
         return 'VALUE ISSUE'
      }
      let boolValue = (value === '0') ? false : true
      let saddr = Array.prototype.map.call(addr, function(digit) {
         if (digit === '0') return false
         if (digit === '1') return true
      }).join(',')
      equipotential.dict[saddr] = boolValue
   }
   return ''
}
</script>
