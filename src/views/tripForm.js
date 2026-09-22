// Alta/edición de viaje
import { supabase } from '../lib/supabase.js'

export async function renderTripForm(container) {
  container.innerHTML = `
    <main>
      <h1>Viajes</h1>
      <form id="trip-form">
        <label>País
          <select name="pais_iso" required></select>
        </label>
        <label>Subdivisión
          <select name="subdivision_iso"><option value="">—</option></select>
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
  const subdivisionSelect = form.querySelector('[name="subdivision_iso"]')
  const submitButton = form.querySelector('button[type="submit"]')
  const cancelButton = form.querySelector('#trip-cancel')
  const error = container.querySelector('#trip-error')
  const list = container.querySelector('#trip-list')

  const paises = await fetch('/data/paises.json').then((r) => r.json())
  paises.sort((a, b) => a.nombre_es.localeCompare(b.nombre_es, 'es'))
  const nombreByIso3 = new Map(paises.map((p) => [p.iso_a3, p.nombre_es]))
  const iso2ByIso3 = new Map(paises.map((p) => [p.iso_a3, p.iso_a2]))

  paisSelect.innerHTML = paises
    .map((p) => `<option value="${p.iso_a3}">${p.nombre_es}</option>`)
    .join('')

  const subdivisionCache = new Map()
  async function loadSubdivisiones(iso3) {
    const iso2 = iso2ByIso3.get(iso3)
    if (!iso2) return []
    if (subdivisionCache.has(iso2)) return subdivisionCache.get(iso2)
    const list = await fetch(`/data/subdivisiones/${iso2}.json`)
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => [])
    subdivisionCache.set(iso2, list)
    return list
  }

  async function refreshSubdivisiones(selected = '') {
    const subdivisiones = await loadSubdivisiones(paisSelect.value)
    subdivisionSelect.innerHTML =
      '<option value="">—</option>' +
      subdivisiones
        .map((s) => `<option value="${s.codigo_iso_3166_2}">${s.nombre}</option>`)
        .join('')
    subdivisionSelect.disabled = subdivisiones.length === 0
    subdivisionSelect.value = selected
  }

  paisSelect.addEventListener('change', () => refreshSubdivisiones())
  await refreshSubdivisiones()

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
        refreshSubdivisiones(trip.subdivision_iso ?? '').then(() => {
          form.lugar.value = trip.lugar ?? ''
          form.fecha_inicio.value = trip.fecha_inicio
          form.fecha_fin.value = trip.fecha_fin ?? ''
          form.tipo.value = trip.tipo
        })
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
    const payload = {
      pais_iso: values.pais_iso,
      subdivision_iso: values.subdivision_iso || null,
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
