// Vista de lista — equivalente accesible al globo (orbis-design-system.md §6.3, §9)
import { supabase } from '../lib/supabase.js'
import { banderaEmoji, filasPaises, filtrarFilas } from '../lib/geo.js'

const ESTADOS = [
  { id: 'todos', label: 'Todos' },
  { id: 'visitado', label: 'Visitados' },
  { id: 'escala', label: 'Escalas' },
  { id: 'no visitado', label: 'No visitados' },
]

const PAISES_CON_SUBDIVISION = ['ES', 'PT', 'FR', 'IT', 'US', 'GB']

const plural = (n) => `${n} viaje${n === 1 ? '' : 's'}`

export async function renderCountryList(container) {
  container.innerHTML = `
    <main id="country-list">
      <h1>Países</h1>
      <p id="country-count" aria-live="polite">Cargando…</p>
      <label>Buscar <input id="country-search" type="search" autocomplete="off"></label>
      <fieldset>
        <legend>Estado</legend>
        ${ESTADOS.map(
          (e, i) =>
            `<label><input type="radio" name="estado" value="${e.id}" ${i === 0 ? 'checked' : ''}> ${e.label}</label>`
        ).join('')}
      </fieldset>
      <ul id="country-rows" aria-label="Países"></ul>
    </main>`
  const count = container.querySelector('#country-count')
  const search = container.querySelector('#country-search')
  const rows = container.querySelector('#country-rows')

  const [paises, { data: viajesData, error }] = await Promise.all([
    fetch('/data/paises.json').then((r) => r.json()),
    supabase.from('viajes').select('pais_iso, tipo, subdivisiones'),
  ])
  if (error) console.error('No se pudieron cargar los viajes para la lista', error)
  const viajes = viajesData ?? []
  const filas = filasPaises(paises, viajes)

  // Nombres de subdivisión: carga perezosa, solo de los países que tienen alguna visitada.
  const nombreSubdivision = new Map()
  const isoA2ConSub = new Set(filas.filter((f) => f.subdivisiones.length).map((f) => f.iso_a2))
  await Promise.all(
    PAISES_CON_SUBDIVISION.filter((iso2) => isoA2ConSub.has(iso2)).map(async (iso2) => {
      const lista = await fetch(`/data/subdivisiones/${iso2}.json`).then((r) => r.json())
      for (const s of lista) nombreSubdivision.set(s.codigo_iso_3166_2, s.nombre)
    })
  )

  const visitados = filas.filter((f) => f.estado === 'visitado').length

  function pintar() {
    const estado = container.querySelector('input[name="estado"]:checked').value
    const visibles = filtrarFilas(filas, { estado, texto: search.value })
    count.textContent = `${visibles.length} de ${filas.length} países · ${visitados} visitados`
    // Cada fila es un <li> con texto: el estado va en palabras, no solo en color/trama.
    // Tabulable (tabindex) para recorrer la lista con teclado y que el lector lea la fila.
    rows.innerHTML = visibles
      .map((f) => {
        const subs = f.subdivisiones
          .map((s) => `${nombreSubdivision.get(s.codigo) ?? s.codigo} (${s.estado})`)
          .join(', ')
        return `<li tabindex="0" data-estado="${f.estado}">
          <span aria-hidden="true">${banderaEmoji(f.iso_a2)}</span>
          <strong>${f.nombre_es}</strong>
          <span>${f.estado}${f.viajes ? `, ${plural(f.viajes)}` : ''}</span>
          ${subs ? `<small>Subdivisiones: ${subs}</small>` : ''}
        </li>`
      })
      .join('')
  }

  search.addEventListener('input', pintar)
  container.querySelectorAll('input[name="estado"]').forEach((r) => r.addEventListener('change', pintar))
  pintar()
}
