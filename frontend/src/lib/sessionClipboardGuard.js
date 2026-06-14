const CLIPBOARD_TYPE = 'application/x-shdl-editor-session'
const SESSION_TOKEN_KEY = 'shdl-editor-clipboard-token'

function sessionToken() {
   let token = sessionStorage.getItem(SESSION_TOKEN_KEY)
   if (!token) {
      token = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
      sessionStorage.setItem(SESSION_TOKEN_KEY, token)
   }
   return token
}

export function installSessionClipboardGuard(editor) {
   const container = editor.container
   const token = sessionToken()

   function onCopy(event) {
      const selectedText = editor.getSelectedText()
      if (!selectedText || !event.clipboardData) return

      event.preventDefault()
      event.clipboardData.setData('text/plain', selectedText)
      event.clipboardData.setData(CLIPBOARD_TYPE, token)
   }

   function onCut(event) {
      const selectedText = editor.getSelectedText()
      if (!selectedText || !event.clipboardData) return

      event.preventDefault()
      event.clipboardData.setData('text/plain', selectedText)
      event.clipboardData.setData(CLIPBOARD_TYPE, token)
      editor.insert('')
   }

   function onPaste(event) {
      if (!event.clipboardData || event.clipboardData.getData(CLIPBOARD_TYPE) !== token) {
         event.preventDefault()
         event.stopImmediatePropagation()
      }
   }

   container.addEventListener('copy', onCopy, true)
   container.addEventListener('cut', onCut, true)
   container.addEventListener('paste', onPaste, true)

   return () => {
      container.removeEventListener('copy', onCopy, true)
      container.removeEventListener('cut', onCut, true)
      container.removeEventListener('paste', onPaste, true)
   }
}
