// Alta/edición de viaje
import { supabase } from '../lib/supabase.js'

const PAISES_CON_SUBDIVISION = ['ES', 'PT', 'FR', 'IT', 'US', 'GB']

export async function renderTripForm(container) {
  container.innerHTML = `
    <main>
      <h1>Viajes</h1>
      <form id="trip-form">
        <label>País
          <select name="pais_iso" required></select>
        </label>
        <label>Subdivisiones (opcional, se puede elegir varias con Ctrl/Cmd + clic)
          <select name="subdivisiones" multiple></select>
        </label>
        <label>Lugar <input name="lugar" type="text"></label>
        <label>Fecha inicio <input name="fecha_inicio" type="date" required></label>
        <label>Fecha fin <input name="fecha_fin" type="date"></label>
        <label>Tipo
          <select name="tipo" required>
            <option value="visita">Visita</option>
            <option value="escala">Escala</option>
          </select>
        </label>
        <button type="submit">Guardar</button>
        <button type="button" id="trip-cancel" hidden>Cancelar edición</button>
        <p id="trip-error" role="alert"></p>
      </form>
      <ul id="trip-list" aria-label="Viajes registrados"></ul>
    </main>`

  const form = container.querySelector('#trip-form')
  const paisSelect = form.querySelector('[name="pais_iso"]')
  const subdivisionSelect = form.querySelector('[name="subdivisiones"]')
  const submitButton = form.querySelector('button[type="submit"]')
  const cancelButton = form.querySelector('#trip-cancel')
  const error = container.querySelector('#trip-error')
  const list = container.querySelector('#trip-list')

  const [paises, ...subdivisionesPorPais] = await Promise.all([
    fetch('/data/paises.json').then((r) => r.json()),
    ...PAISES_CON_SUBDIVISION.map((iso2) =>
      fetch(`/data/subdivisiones/${iso2}.json`).then((r) => r.json())
    ),
  ])
  paises.sort((a, b) => a.nombre_es.localeCompare(b.nombre_es, 'es'))
  const nombreByIso3 = new Map(paises.map((p) => [p.iso_a3, p.nombre_es]))
  const iso2ByIso3 = new Map(paises.map((p) => [p.iso_a3, p.iso_a2]))

  // codigo_iso_3166_2 → nombre, y iso_a2 → lista de subdivisiones de ese país.
  const nombreSubdivision = new Map()
  const subdivisionesPorIso2 = new Map()
  PAISES_CON_SUBDIVISION.forEach((iso2, i) => {
    subdivisionesPorIso2.set(iso2, subdivisionesPorPais[i])
    for (const s of subdivisionesPorPais[i]) nombreSubdivision.set(s.codigo_iso_3166_2, s.nombre)
  })

  paisSelect.innerHTML = paises
    .map((p) => `<option value="${p.iso_a3}">${p.nombre_es}</option>`)
    .join('')

  function refreshSubdivisiones(seleccionadas = []) {
    const subdivisiones = subdivisionesPorIso2.get(iso2ByIso3.get(paisSelect.value)) ?? []
    subdivisionSelect.innerHTML = subdivisiones
      .map((s) => `<option value="${s.codigo_iso_3166_2}">${s.nombre}</option>`)
      .join('')
    subdivisionSelect.disabled = subdivisiones.length === 0
    for (const option of subdivisionSelect.options) {
      option.selected = seleccionadas.includes(option.value)
    }
  }

  paisSelect.addEventListener('change', () => refreshSubdivisiones())
  refreshSubdivisiones()

  let editingId = null

  function resetForm() {
    editingId = null
    form.reset()
    refreshSubdivisiones()
    submitButton.textContent = 'Guardar'
    cancelButton.hidden = true
  }

  cancelButton.addEventListener('click', resetForm)

  async function loadTrips() {
    const { data, error: readError } = await supabase
      .from('viajes')
      .select('*')
      .order('fecha_inicio', { ascending: false })
    if (readError) {
      error.textContent = 'No se pudieron cargar los viajes.'
      return
    }
    list.innerHTML = data
      .map(
        (trip) => `
      <li data-id="${trip.id}">
        <span>${nombreByIso3.get(trip.pais_iso) ?? trip.pais_iso}</span>
        <span>${(trip.subdivisiones ?? []).map((c) => nombreSubdivision.get(c) ?? c).join(', ')}</span>
        <span>${trip.lugar ?? ''}</span>
        <span>${trip.fecha_inicio}${trip.fecha_fin ? ' → ' + trip.fecha_fin : ''}</span>
        <span>${trip.tipo}</span>
        <button type="button" data-action="edit">Editar</button>
        <button type="button" data-action="delete">Borrar</button>
      </li>`
      )
      .join('')

    list.querySelectorAll('[data-action="edit"]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.closest('li').dataset.id
        const trip = data.find((t) => t.id === id)
        editingId = trip.id
        paisSelect.value = trip.pais_iso
        refreshSubdivisiones(trip.subdivisiones ?? [])
        form.lugar.value = trip.lugar ?? ''
        form.fecha_inicio.value = trip.fecha_inicio
        form.fecha_fin.value = trip.fecha_fin ?? ''
        form.tipo.value = trip.tipo
        submitButton.textContent = 'Guardar cambios'
        cancelButton.hidden = false
      })
    })

    list.querySelectorAll('[data-action="delete"]').forEach((button) => {
      button.addEventListener('click', async () => {
        if (!window.confirm('¿Borrar este viaje?')) return
        const id = button.closest('li').dataset.id
        const { error: deleteError } = await supabase.from('viajes').delete().eq('id', id)
        if (deleteError) {
          error.textContent = 'No se pudo borrar el viaje.'
          return
        }
        if (editingId === id) resetForm()
        loadTrips()
      })
    })
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    error.textContent = ''
    submitButton.disabled = true

    const values = Object.fromEntries(new FormData(form))
    const subdivisiones = [...subdivisionSelect.selectedOptions].map((o) => o.value)
    const payload = {
      pais_iso: values.pais_iso,
      subdivisiones: subdivisiones.length ? subdivisiones : null,
      lugar: values.lugar || null,
      fecha_inicio: values.fecha_inicio,
      fecha_fin: values.fecha_fin || null,
      tipo: values.tipo,
    }

    const { error: writeError } = editingId
      ? await supabase.from('viajes').update(payload).eq('id', editingId)
      : await supabase.from('viajes').insert([payload])

    submitButton.disabled = false
    if (writeError) {
      error.textContent = 'No se pudo guardar el viaje.'
      return
    }
    resetForm()
    loadTrips()
  })

  await loadTrips()
}
