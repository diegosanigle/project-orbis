// Ficha de país: viajes allí, subdivisiones visitadas y notas
import { supabase } from '../lib/supabase.js'
import { renderMarkdown } from '../lib/markdown.js'
import { banderaEmoji, estadoPorPais, estadoPorSubdivision } from '../lib/geo.js'
import { viajesDelTimeline } from '../lib/timeline.js'

const PAISES_CON_SUBDIVISION = ['ES', 'PT', 'FR', 'IT', 'US', 'GB']

export async function renderCountryDetail(container, isoA3, { onBack }) {
  container.innerHTML = `
    <main id="country-detail">
      <button type="button" id="detail-back">← Lista</button>
      <h1 id="detail-title">Cargando…</h1>
      <p id="detail-error" role="alert"></p>
      <div id="detail-body"></div>
    </main>`
  container.querySelector('#detail-back').addEventListener('click', onBack)
  const title = container.querySelector('#detail-title')
  const body = container.querySelector('#detail-body')

  const [paises, { data, error }] = await Promise.all([
    fetch('/data/paises.json').then((r) => r.json()),
    supabase.from('viajes').select('*').eq('pais_iso', isoA3),
  ])
  const pais = paises.find((p) => p.iso_a3 === isoA3)
  if (!pais) {
    title.textContent = 'País no encontrado'
    return
  }
  title.textContent = `${banderaEmoji(pais.iso_a2)} ${pais.nombre_es}`
  if (error) {
    container.querySelector('#detail-error').textContent = 'No se pudieron cargar los viajes.'
    return
  }
  const viajes = viajesDelTimeline(data ?? [])
  const info = estadoPorPais(viajes).get(isoA3)

  // Nombres de subdivisión: carga perezosa, solo si este país las tiene.
  const subs = [...estadoPorSubdivision(viajes).entries()]
  const nombreSub = new Map()
  if (subs.length && PAISES_CON_SUBDIVISION.includes(pais.iso_a2)) {
    const lista = await fetch(`/data/subdivisiones/${pais.iso_a2}.json`).then((r) => r.json())
    for (const s of lista) nombreSub.set(s.codigo_iso_3166_2, s.nombre)
  }

  const n = viajes.length
  body.innerHTML = `
    <p>${pais.continente} · ${info?.estado ?? 'no visitado'}${n ? `, ${n} viaje${n === 1 ? '' : 's'}` : ''}</p>
    ${
      subs.length
        ? `<h2>Subdivisiones</h2><ul>${subs
            .map(([codigo, s]) => `<li>${nombreSub.get(codigo) ?? codigo} (${s.estado})</li>`)
            .join('')}</ul>`
        : ''
    }
    <h2>Viajes</h2>
    ${
      n
        ? `<ol>${viajes
            .map(
              (v) => `<li>
          <span>${v.fecha_inicio}${v.fecha_fin ? ' → ' + v.fecha_fin : ''}</span>
          <span>${v.tipo}</span>
          ${v.lugar ? `<span>${v.lugar}</span>` : ''}
          ${v.notas ? `<div>${renderMarkdown(v.notas)}</div>` : ''}
        </li>`
            )
            .join('')}</ol>`
        : '<p>Aún no hay viajes a este país.</p>'
    }`
}
