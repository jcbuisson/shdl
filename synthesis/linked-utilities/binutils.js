
const _ = require('lodash')


module.exports = (function() {

   function opposite(bin, n) {
      let result = ''
      let found1 = false
      for (let i = n-1; i >= 0; i--) {
         let c = parseInt(bin.charAt(i))
         result = (found1 ? 1-c : c) + result
         if (c === 1) found1 = true
      }
      return result
   }

   function opposite13(bin13) {
      let result = ''
      let found1 = false
      for (let i = 12; i >= 0; i--) {
         let c = parseInt(bin32.charAt(i))
         result = (found1 ? 1-c : c) + result
         if (c === 1) found1 = true
      }
      return result
   }

   function add32(bin32a, bin32b) {
      let result = ''
      let carry = false
      let a, b, sum
      for (let i = 31; i >= 0; i--) {
         a = bin32a.charAt(i)
         b = bin32b.charAt(i)
         sum = a === b ? 0 : 1
         sum = carry ? 1-sum : sum
         result = sum + result
         carry = (a === '1' && b === '1') || (a === '1' && carry || b === '1') && carry
      }
      let V = (a === '1' && b === '1' && sum === 0) || (a === '0' && b === '0' && sum === 1)
      return { result: result, V: V, C: carry }
   }

   function sub32(bin32a, bin32b) {
      let { result: res, V: V, C: C } = add32(bin32a, opposite(bin32b, 32))
      return { result: res, V: V, C: !C }
   }

   function and32(bin32a, bin32b) {
      let result = ''
      for (let i = 0; i < 32; i++) {
         let on = bin32a.charAt(i) === '1' && bin32b.charAt(i) === '1'
         result += (on ? '1' : '0')
      }
      console.log('and32 bin32a', bin32a, 'bin32b', bin32b, 'result', result)
      return result
   }

   function or32(bin32a, bin32b) {
      let result = ''
      for (let i = 0; i < 32; i++) {
         let on = bin32a.charAt(i) === '1' || bin32b.charAt(i) === '1'
         result += (on ? '1' : '0')
      }
      return result
   }

   function xor32(bin32a, bin32b) {
      let result = ''
      for (let i = 0; i < 32; i++) {
         let on = bin32a.charAt(i) !== bin32b.charAt(i)
         result += (on ? '1' : '0')
      }
      return result
   }

   function slr32(bin32a, bin5b) {
      let n = parseInt(bin5b, 2)
      return _.padStart(bin32a.substring(0, 32-n), 32, '0')
   }

   function sll32(bin32a, bin5b) {
      let n = parseInt(bin5b, 2)
      return _.padEnd(bin32a.substring(n), 32, '0')
   }



   function bin32ToUnsigned(bin32) {
      return parseInt(bin32, 2)
   }

   function bin16ToUnsigned(bin16) {
      return parseInt(bin16, 2)
   }

   function bin32ToSigned(bin32) {
      if (bin32.charAt(0) === '1') {
         // negative
         return -bin32ToUnsigned(opposite(bin32, 32))
      } else {
         // positive or zero
         return parseInt(bin32, 2)
      }
   }

   function unsignedToBin32(unsignedInt) {
      return _.padStart(Number(unsignedInt).toString(2), 32, '0')
   }

   function signedToBin32(signedInt) {
      if (signedInt >= 0) {
         return unsignedToBin32(signedInt)
      } else {
         let abs32 = _.padStart(Number(-signedInt).toString(2), 32, '0')
         return opposite(abs32, 32)
      }
   }

   function signedToBin13(signedInt) {
      if (signedInt >= 0) {
         return _.padStart(Number(signedInt).toString(2), 13, '0')
      } else {
         let abs13 = _.padStart(Number(-signedInt).toString(2), 13, '0')
         return opposite(abs13, 13)
      }
   }

   function unsignedToHex8(unsignedInt) {
      return _.padStart(Number(unsignedInt).toString(16), 8, '0')
   }

   function bin4ToHex(bin4str) {
      let i = parseInt(bin4str, 2)
      return i.toString(16)
   }

   function bin32ToHex8(bin32str) {
      let result = ''
      for (let i = 0; i < 8; i++) {
         let bin4str = bin32str.substring(i*4, i*4+4)
         result += bin4ToHex(bin4str)
      }
      return result
   }

   // "101", 8 => "00000101", "0x8490 a005", 32 => "10000100100100001010000000000101"
   function strToBin(str, length) {
      str = str.replace(' ', '').toLowerCase()
      let bin32 = str.startsWith('0x')
         ? parseInt(str, 16).toString(2).padStart(length, '0')
         : str
      return bin32
   }

   return {
      add32,
      sub32,
      and32,
      or32,
      xor32,
      slr32,
      sll32,
      bin32ToSigned,
      bin16ToUnsigned,
      bin32ToUnsigned,
      signedToBin32,
      signedToBin13,
      unsignedToBin32,
      unsignedToHex8,
      bin32ToHex8,
      bin4ToHex,
      strToBin,
   }

})()
