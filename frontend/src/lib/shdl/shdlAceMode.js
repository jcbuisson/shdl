import ace from 'ace-builds'

ace.define('ace/mode/shdl_highlight_rules', [
   'require', 'exports', 'module',
   'ace/lib/oop',
   'ace/mode/text_highlight_rules',
], function(require, exports, module) {
   const oop = require('ace/lib/oop')
   const TextHighlightRules = require('ace/mode/text_highlight_rules').TextHighlightRules

   const ShdlHighlightRules = function() {
      this.$rules = {
         start: [
            // Line comments (// and #)
            { token: 'comment', regex: '\\/\\/.*$' },
            { token: 'comment', regex: '#.*$' },

            // Bitfield literals "0101..."
            { token: 'string', regex: '"[01]*"' },

            // Keywords — must come before the generic identifier rule
            {
               token: 'shdl.opcode',
               regex: '\\b(?:module|end|on|reset|set|enabled|when|output|fsm|statemachine|asynchronous|synchronous|map)\\b',
            },

            // Module / submodule names — identifier immediately before '('
            // covers both the definition name and all instantiations
            { token: 'shdl.module', regex: '[a-zA-Z_][a-zA-Z0-9_]*(?=\\s*\\()' },

            // Remaining identifiers (signal names) — plain text so digits
            // inside them are not falsely colored as numbers
            { token: 'text', regex: '[a-zA-Z_][a-zA-Z0-9_]*' },

            // Predefined module prefix ($ram_..., $rom, ...)
            { token: 'keyword.control', regex: '\\$' },

            // Numbers: vector indices and standalone bit literals
            { token: 'constant.numeric', regex: '[0-9]+' },

            // '[' opens vector index — enter dedicated state for coloring
            { token: 'keyword.operator', regex: '\\[', next: 'vector_index' },

            // Multi-char operators — order matters (longer alternatives first)
            { token: 'keyword.operator', regex: ':=' },   // sequential assignment
            { token: 'keyword.operator', regex: '->' },   // FSM / map arrow

            // Single-char operators and punctuation
            // /  NOT operator   *  AND / product   +  OR / sum
            // &  concatenation  =  assignment
            // ':' and '..' are NOT listed here — they only appear inside [...]
            { token: 'keyword.operator', regex: '[=+*/&()\\],;]' },
         ],

         // Inside [...]: numbers, '..' and ':' get a distinct index color
         vector_index: [
            { token: 'shdl.vector', regex: '[0-9]+' },
            { token: 'shdl.vector', regex: '\\.\\.' },
            { token: 'shdl.vector', regex: ':' },
            { token: 'keyword.operator', regex: '\\]', next: 'start' },
            { defaultToken: 'text' },
         ],
      }
   }

   oop.inherits(ShdlHighlightRules, TextHighlightRules)
   exports.ShdlHighlightRules = ShdlHighlightRules
})

ace.define('ace/mode/shdl', [
   'require', 'exports', 'module',
   'ace/lib/oop',
   'ace/mode/text',
   'ace/mode/shdl_highlight_rules',
], function(require, exports, module) {
   const oop = require('ace/lib/oop')
   const TextMode = require('ace/mode/text').Mode
   const { ShdlHighlightRules } = require('ace/mode/shdl_highlight_rules')

   const Mode = function() {
      this.HighlightRules = ShdlHighlightRules
   }
   oop.inherits(Mode, TextMode)

   exports.Mode = Mode
})
