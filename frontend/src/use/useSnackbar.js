
// see App.vue

import { ref } from 'vue'

export const snackbar = ref({})

export function displaySnackbar({ text, color, timeout }) {
   snackbar.value = { text, color, timeout, visible: true }
}
