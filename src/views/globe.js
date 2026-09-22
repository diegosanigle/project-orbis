import Globe from 'globe.gl'
import * as THREE from 'three'
import { supabase } from '../lib/supabase.js'
import { bboxGrados, estadoPorPais } from '../lib/geo.js'

const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

// Densidad de la trama de puntos de "escala": grados de longitud/latitud por dot.
// Cada país tiene su propio UV 0-1 (three-globe), así que el repeat de la textura se
// calibra por país. Se acota entre MIN y MAX: sin tope, un país enorme (Rusia) pediría
// un repeat tan alto que el mipmapping del GPU lo difumina hasta volverlo invisible
// (aliasing), y sin mínimo un país diminuto (Luxemburgo) se quedaría sin ningún punto.
const GRADOS_POR_DOT = 0.5
const REPEAT_MIN = 2
const REPEAT_MAX = 10

function crearCanvasEscala() {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = css('--globe-land')
  ctx.fillRect(0, 0, 64, 64)
  ctx.fillStyle = css('--orange')
  ctx.beginPath()
  ctx.arc(32, 32, 10, 0, Math.PI * 2)
  ctx.fill()
  return canvas
}

export async function renderGlobe(container) {
  container.innerHTML = `
    <div id="globe"></div>
    <p id="globe-label" aria-live="polite">Cargando globo…</p>
    <ul id="globe-legend">
      <li><span class="swatch" data-estado="no-visitado"></span> No visitado</li>
      <li><span class="swatch" data-estado="escala"></span> Escala</li>
      <li><span class="swatch" data-estado="visitado"></span> Visitado</li>
    </ul>`
  const el = container.querySelector('#globe')
  const label = container.querySelector('#globe-label')

  const [paises, geo, { data: viajesData, error: viajesError }] = await Promise.all([
    fetch('/data/paises.json').then((r) => r.json()),
    fetch('/data/paises.geojson').then((r) => r.json()),
    supabase.from('viajes').select('pais_iso, tipo'),
  ])
  if (viajesError) console.error('No se pudieron cargar los viajes para el globo', viajesError)
  const nombres = new Map(paises.map((p) => [p.iso_a3, p.nombre_es]))
  const estado = estadoPorPais(viajesData ?? [])

  const canvasEscala = crearCanvasEscala()
  const dataUrlEscala = canvasEscala.toDataURL()
  const texturaEscala = new THREE.CanvasTexture(canvasEscala)
  texturaEscala.wrapS = texturaEscala.wrapT = THREE.RepeatWrapping
  texturaEscala.colorSpace = THREE.SRGBColorSpace

  container.querySelector('.swatch[data-estado="escala"]').style.backgroundImage = `url(${dataUrlEscala})`

  const materialNoVisitado = new THREE.MeshBasicMaterial({ color: css('--globe-land') })
  const materialVisitado = new THREE.MeshBasicMaterial({ color: css('--orange') })

  function repeatEnRango(gradosLado) {
    return Math.min(REPEAT_MAX, Math.max(REPEAT_MIN, Math.round(gradosLado / GRADOS_POR_DOT)))
  }

  function materialEscala(feature) {
    const { anchoLng, altoLat } = bboxGrados(feature.geometry)
    const tex = texturaEscala.clone()
    tex.needsUpdate = true
    tex.repeat.set(repeatEnRango(anchoLng), repeatEnRango(altoLat))
    return new THREE.MeshBasicMaterial({ map: tex })
  }

  function materialPara(feature) {
    const info = estado.get(feature.properties.iso_a3)
    if (!info) return materialNoVisitado
    if (info.estado === 'visitado') return materialVisitado
    return materialEscala(feature)
  }

  const globe = Globe()(el)
    .width(window.innerWidth)
    .height(window.innerHeight)
    .backgroundColor(css('--sky'))
    .showAtmosphere(false)
    .polygonsData(geo.features)
    .polygonCapMaterial((f) => materialPara(f))
    .polygonSideColor(() => 'rgba(0,0,0,0)')
    .polygonStrokeColor(() => css('--ink'))
    .polygonAltitude(0.005)
    .onPolygonClick((f) => {
      const iso3 = f.properties.iso_a3
      const nombre = nombres.get(iso3) ?? iso3
      const info = estado.get(iso3)
      label.textContent = info
        ? `${nombre}, ${info.estado}, ${info.viajes} viaje${info.viajes === 1 ? '' : 's'}`
        : `${nombre}, no visitado`
    })

  // iPhone: densidad ×3 multiplica el coste de render; con 2 sigue nítido y va bastante más fluido.
  globe.renderer().setPixelRatio(Math.min(window.devicePixelRatio, 2))
  globe.onGlobeReady(() => {
    label.textContent = 'Toca un país'
  })

  const controls = globe.controls()
  controls.minDistance = 130
  controls.maxDistance = 400
  controls.enableDamping = true

  window.addEventListener('resize', () => globe.width(window.innerWidth).height(window.innerHeight))
}
