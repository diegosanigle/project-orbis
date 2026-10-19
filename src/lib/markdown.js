// Render de notas: marked + sanitizado con DOMPurify
import { marked } from 'marked'
import DOMPurify from 'dompurify'

// Devuelve HTML seguro para insertar con innerHTML: el Markdown se convierte y
// DOMPurify lo limpia siempre ANTES de que toque el DOM.
export function renderMarkdown(texto) {
  return DOMPurify.sanitize(marked.parse(texto ?? '', { async: false }))
}
