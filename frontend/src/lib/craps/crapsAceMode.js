import ace from 'ace-builds'

ace.define('ace/mode/craps_highlight_rules', [
   'require', 'exports', 'module',
   'ace/lib/oop',
   'ace/mode/text_highlight_rules',
], function(require, exports, module) {
   const oop = require('ace/lib/oop')
   const TextHighlightRules = require('ace/mode/text_highlight_rules').TextHighlightRules

   const CrapsHighlightRules = function() {
      // Real instruction mnemonics — longest alternatives first
      const realInstructions =
         'addcc|add|subcc|sub|andcc|and|orcc|or|xorcc|xor|umulcc|slr|sll|ld|st|sethi|reti'

      // Branch instructions — condition codes ordered longest-first (mirrors grammar Cond rule)
      const branchInstructions =
         'b(?:leu|le|lu|lt|l|neg|ne|nz|nn|n|geu|ge|gt|gu|g|a|z|pos|cs|cc|vs|vc|eq|e)'

      // Synthetic instruction mnemonics — longest alternatives first
      const syntheticInstructions =
         'inccc|inc|deccc|dec|negcc|setq|set|clr|mov|cmp|tst|nop|call|ret|push|pop'

      this.$rules = {
         start: [
            // Line comment
            {
               token: 'comment',
               regex: '\\/\\/.*$',
            },
            // Block comment — opens multi-line state
            {
               token: 'comment',
               regex: '\\/\\*',
               next: 'comment_block',
            },
            // Assembler directives (.org, .word)
            {
               token: 'keyword.control',
               regex: '\\.(?:org|word)\\b',
            },
            // Label definition: identifier followed by ':'
            {
               token: 'entity.name.tag',
               regex: '[a-zA-Z0-9_]+(?=\\s*:)',
            },
            // EQU label: identifier followed by '='
            {
               token: 'entity.name.tag',
               regex: '[a-zA-Z0-9_]+(?=\\s*=)',
            },
            // Registers: %r0–%r31, %fp, %sp, %pc, %ir
            {
               token: 'variable.language',
               regex: '%(?:r\\d+|fp|sp|pc|ir)\\b',
            },
            // Real instructions — craps.opcode maps to .ace_craps.ace_opcode (custom CSS)
            {
               token: 'craps.opcode',
               regex: '\\b(?:' + realInstructions + ')\\b',
            },
            // Branch instructions
            {
               token: 'craps.opcode',
               regex: '\\b' + branchInstructions + '\\b',
            },
            // Synthetic instructions
            {
               token: 'craps.opcode',
               regex: '\\b(?:' + syntheticInstructions + ')\\b',
            },
            // Numbers: binary, hexadecimal, decimal (with optional leading minus)
            {
               token: 'constant.numeric',
               regex: '-?(?:0b[01]+|0x[0-9a-fA-F]+|[0-9]+)\\b',
            },
            // Operators and punctuation
            {
               token: 'keyword.operator',
               regex: '[+\\-*\\/,\\[\\]()]',
            },
            // '=' used in EQU directives
            {
               token: 'keyword.operator',
               regex: '=',
            },
         ],
         comment_block: [
            {
               token: 'comment',
               regex: '\\*\\/',
               next: 'start',
            },
            {
               defaultToken: 'comment',
            },
         ],
      }
   }

   oop.inherits(CrapsHighlightRules, TextHighlightRules)
   exports.CrapsHighlightRules = CrapsHighlightRules
})

ace.define('ace/mode/craps', [
   'require', 'exports', 'module',
   'ace/lib/oop',
   'ace/mode/text',
   'ace/mode/craps_highlight_rules',
], function(require, exports, module) {
   const oop = require('ace/lib/oop')
   const TextMode = require('ace/mode/text').Mode
   const { CrapsHighlightRules } = require('ace/mode/craps_highlight_rules')

   const Mode = function() {
      this.HighlightRules = CrapsHighlightRules
   }
   oop.inherits(Mode, TextMode)

   exports.Mode = Mode
})
