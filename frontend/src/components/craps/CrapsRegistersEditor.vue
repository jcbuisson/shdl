
<template>
   <div class="card no-block memory-editor">

      <div>
         <v-select flat
            :items="bases"
            v-model="base"
            label="Registers"
            @change="update"
         ></v-select>
      </div>
      <div class="memory-editor-body" style="overflow: auto;">
         <code-mirror
            :value="textContent"
            :options="editorOptions"
         ></code-mirror>
      </div>
   </div>
</template>

<script>
   import codemirror from '@/components/craps/CrapsCodeMirror'
   import _ from 'lodash'
   const binutils = require('@/utilities/binutils.js')


   export default {
      components: {
         CodeMirror: codemirror,
      },
      props: {
         title: String,
         registerValues: Array,
      },
      data () {
         return {
            editorOptions: {
               mode: "text/BIDON",
               lineWrapping: false,
               readOnly: true,
               tabSize: 3,
               lineNumbers: false,
               firstLineNumber: 0,
            },
            textContent: '',
            bases: ['binary', 'hexadecimal', 'signed decimal', 'unsigned decimal'],
            base: 'hexadecimal',
         }
      },
      methods: {
         update () {
            let result = ''
            let base = this.base
            this.registerValues.forEach(function(bin32value, index) {
               let value
               if (base === 'binary') {
                  value = bin32value
               } else if (base === 'hexadecimal') {
                  value = binutils.bin32ToHex8(bin32value)
               } else if (base === 'signed decimal') {
                  value = binutils.bin32ToSigned(bin32value)
               } else if (base === 'unsigned decimal') {
                  value = binutils.bin32ToUnsigned(bin32value)
               }
               result += `${_.padStart('%r' + index, 5, ' ')} ${value}\n`
            })
            this.textContent = result
         },
      },
      watch: {
         'registerValues': function (newVal, oldVal) {
            this.update()
         },
      },
   }
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.memory-editor {
   display: flex;
   flex-direction: column;  
   justify-content: flex-start;

   align-items: stretch;
   align-content: stretch;
}

.memory-editor-body {
   flex: 1;
   background: rgba(100, 0, 100, .1);
}
</style>
