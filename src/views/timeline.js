// Timeline: viajes en orden cronológico inverso, filtrables por año
import { supabase } from '../lib/supabase.js'
import { renderMarkdown } from '../lib/markdown.js'
import { banderaEmoji } from '../lib/geo.js'
import { aniosConViajes, viajesDelTimeline } from '../lib/timeline.js'

export async function renderTimeline(container) {
  container.innerHTML = `
    <main id="timeline">
      <h1>Timeline</h1>
      <label>Año <select id="timeline-year"></select></label>
      <p id="timeline-error" role="alert"></p>
      <ol id="timeline-list" aria-label="Viajes por fecha"></ol>
    </main>`
  const select = container.querySelector('#timeline-year')
  const list = container.querySelector('#timeline-list')

  const [paises, { data, error }] = await Promise.all([
    fetch('/data/paises.json').then((r) => r.json()),
    supabase.from('viajes').select('*'),
  ])
  if (error) {
    container.querySelector('#timeline-error').textContent = 'No se pudieron cargar los viajes.'
    return
  }
  const viajes = data ?? []
  const pais = new Map(paises.map((p) => [p.iso_a3, p]))

  select.innerHTML =
    `<option value="">Todos</option>` +
    aniosConViajes(viajes).map((a) => `<option value="${a}">${a}</option>`).join('')

  function pintar() {
    const anio = select.value ? Number(select.value) : null
    const visibles = viajesDelTimeline(viajes, anio)
    if (!visibles.length) {
      list.innerHTML = '<li>No hay viajes.</li>'
      return
    }
    list.innerHTML = visibles
      .map((v) => {
        const p = pais.get(v.pais_iso)
        return `<li>
          <span aria-hidden="true">${banderaEmoji(p?.iso_a2)}</span>
          <strong>${p?.nombre_es ?? v.pais_iso}</strong>
          <span>${v.tipo}</span>
          <span>${v.fecha_inicio}${v.fecha_fin ? ' → ' + v.fecha_fin : ''}</span>
          ${v.lugar ? `<span>${v.lugar}</span>` : ''}
          ${v.notas ? `<div>${renderMarkdown(v.notas)}</div>` : ''}
        </li>`
      })
      .join('')
  }

  select.addEventListener('change', pintar)
  pintar()
}
