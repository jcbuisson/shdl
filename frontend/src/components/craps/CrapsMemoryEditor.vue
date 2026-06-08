
<template>
   <textarea></textarea>
</template>

<script>
   import _ from 'lodash'
   const CodeMirror = require('codemirror/lib/codemirror.js')
   const binutils = require('@/utilities/binutils.js')

   function makeMarker() {
      var marker = document.createElement("div")
      marker.style.color = "#822"
      marker.innerHTML = "●"
      return marker
   }

   export default {
      props: {
         title: String,
         memorydict: Object,
         currentaddress: Number,
         breakpoints: Array,
         versionNo: Number,  // change it when view needs refresh
      },

      data () {
         return {
            editor: null,
            textContent: '',
            options: {
               styleActiveLine: true,
               lineNumbers: false,
               firstLineNumber: 1,
               lineWrapping: false,
               readOnly: true,
               gutter: true,
               fixedGutter: true,
               gutters: ["breakpoints"],
            },
            selectedline: -1,
            breakpointsOldVal: [],
         }
      },

      created: function() {
         // adapted from https://github.com/codemirror/CodeMirror/blob/master/demo/simplemode.html
         CodeMirror.defineSimpleMode("simplemode", {
            // The start state contains the rules that are intially used
            start: [
               // The regex matches the token, the token property contains the type
               //{regex: /"(?:[^\\]|\\.)*?(?:"|$)/, token: "string"},
               // You can match multiple tokens at once. Note that the captured
               // groups must span the whole string in this case
               //{regex: /(function)(\s+)([a-z$][\w$]*)/, token: ["keyword", null, "variable-2"]},
               // Rules are matched in the order in which they appear, so there is
               // no ambiguity between this one and the one above
               //{regex: /(?:function|var|return|if|for|while|else|do|this)\b/, token: "keyword"},

               {regex: /(?:word|org)\b/, token: "keyword"},
               {regex: /(?:clr|mov|dec|deccc|inc|inccc|set|setq|cmp|tst|negcc|nop|call|rcall|ret|push|pop)\b/, token: "keyword"},
               {regex: /(?:add|addcc|sub|subcc|xor|xorcc|or|orcc|and|andcc|umulcc|ld|st|sethi|ba|beq|be|bz|bne|bnz|bneg|bn|bpos|bnn|bcs|blu|bcc|bgeu|bvs|bvc|bg|bgt|bge|bl|blt|ble|bgu|bleu)\b/, token: "keyword"},

               {regex: /0x[a-f\d]+|[-+]?(?:\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/i, token: "number"},
               {regex: /\/\/.*/, token: "comment"},
               //{regex: /\/(?:[^\\]|\\.)*?\//, token: "variable-3"},
               // A next property will cause the mode to move to a different state
               {regex: /\/\*/, token: "comment", next: "comment"},
               {regex: /[-+/*=<>!]+/, token: "operator"},
               // indent and dedent properties guide autoindentation
               //{regex: /[\{\[\(]/, indent: true},
               //{regex: /[\}\]\)]/, dedent: true},
               //{regex: /[a-z$][\w$]*/, token: "variable"},
               // You can embed other modes with the mode property. This rule
               // causes all code between << and >> to be highlighted with the XML
               // mode.
               //{regex: /<</, token: "meta", mode: {spec: "xml", end: />>/}}
            ],
            // The multi-line comment state.
            comment: [
               {regex: /.*?\*\//, token: "comment", next: "start"},
               {regex: /.*/, token: "comment"}
            ],
            // The meta property contains global information about the mode. It
            // can contain properties like lineComment, which are supported by
            // all modes, and also directives like dontIndentStates, which are
            // specific to simple modes.
            meta: {
               dontIndentStates: ["comment"],
               lineComment: "//"
            },

         })
      },

      mounted: function () {
         let self = this
         this.editor = CodeMirror.fromTextArea(this.$el, this.options)
         this.editor.setOption('styleActiveLine', this.styleactiveline)
         this.editor.setValue(this.textContent)
         this.editor.on('gutterClick', function(cm, n) {
            let info = cm.lineInfo(n);
            //cm.setGutterMarker(n, "breakpoints", info.gutterMarkers ? null : makeMarker());
            self.$emit('breakpoint', info.line + 1, info.gutterMarkers ? false : true)
         })
         this.editor.setOption('mode', 'simplemode')
      },


      methods: {
         formatMemoryValue (bin32str) {
            return binutils.bin32ToHex8(bin32str)
         },
         formatAddress (address) {
            return binutils.unsignedToHex8(address)
         },
         getTextContent: function() {
            let lineno = 0
            let address2line = this.memorydict
            let result = ''
            let previousAddress
            for (let addressKey in address2line) {
               let line = address2line[addressKey]
               let address = parseInt(addressKey)
               line.address = address
               if (result.length > 0 && address > previousAddress + 1) {
                  result += '---\n'
                  lineno++
               }
               line.lineno = lineno++
               let formattedAddress = this.formatAddress(address)
               let formattedValue = this.formatMemoryValue(line.value)
               let label = line.label ? line.label + ':' : ''
               let text = line.instruction ? line.instruction.text : line.synthetic ? line.synthetic.text : ''
               result += `${formattedAddress} : ${formattedValue} ${_.padStart(label, 10, ' ')}  ${text}\n`
               previousAddress = address
            }
            return result
         },
      },
      watch: {
         'currentaddress': function(newVal, oldVal) {
            let line = this.memorydict[newVal]
            // hack: line.lineno is undefined initially (? why)
            this.selectedline = typeof(line.lineno) === 'undefined' ? 0 : line.lineno
         },
         versionNo: function(newVal, oldVal) {
            this.textContent = this.getTextContent()
         },

         'textContent': function (newVal, oldVal) {
            let editorValue = this.editor.getValue()
            if (newVal !== editorValue) {
               this.editor.removeLineClass(oldVal, "background", "styled-background")
               var scrollInfo = this.editor.getScrollInfo()
               this.editor.setValue(newVal)
               this.editor.scrollTo(scrollInfo.left, scrollInfo.top)
            }
         },
         'selectedline': function(newVal, oldVal) {
            if (typeof(oldVal) === 'number') this.editor.removeLineClass(oldVal, "background", "styled-background")
            if (typeof(newVal) === 'number') this.editor.addLineClass(newVal, "background", "styled-background")
         },
         'styleactiveline': function(newVal, oldVal) {
            this.editor.setOption('styleActiveLine', newVal)
         },
         'options': function (newOptions, oldVal) {
            if (typeof newOptions === 'object') {
               for (var optionName in newOptions) {
                  if (newOptions.hasOwnProperty(optionName)) {
                     this.editor.setOption(optionName, newOptions[optionName])
                  }
               }
            }
         },
         'breakpoints': function(newVal, oldVal) {
            //?? oldVal uncorrect, supply it with breakpointsOldVal
            let self = this
            this.breakpointsOldVal.forEach(breakAddress => {
               let lineno = self.memorydict[breakAddress].lineno
               self.editor.removeLineClass(lineno, "color", "breakpoint-background")
            })
            newVal.forEach(breakAddress => {
               let lineno = self.memorydict[breakAddress].lineno
               self.editor.addLineClass(lineno, "color", "breakpoint-background")
            })
            this.breakpointsOldVal = _.clone(newVal)
         },
      },

      beforeDestroy: function () {
         if (this.editor) {
            this.editor.toTextArea()
         }
      }
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
