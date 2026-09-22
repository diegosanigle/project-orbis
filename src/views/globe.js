import Globe from 'globe.gl'
import * as THREE from 'three'
import { supabase } from '../lib/supabase.js'
import { bboxGrados, estadoPorPais, estadoPorSubdivision, normalizarBobinado } from '../lib/geo.js'

const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

const PAISES_CON_SUBDIVISION = ['ES', 'PT', 'FR', 'IT', 'US', 'GB']
const ALTITUD_PAIS = 0.005
const ALTITUD_SUBDIVISION = 0.006 // por encima del país: gana el raycast del click y evita z-fighting

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

  const [paises, geo, { data: viajesData, error: viajesError }, ...subdivisionesPorPais] = await Promise.all([
    fetch('/data/paises.json').then((r) => r.json()),
    fetch('/data/paises.geojson').then((r) => r.json()),
    supabase.from('viajes').select('pais_iso, tipo, subdivisiones'),
    ...PAISES_CON_SUBDIVISION.map((iso2) =>
      Promise.all([
        fetch(`/data/subdivisiones/${iso2}.geojson`).then((r) => r.json()),
        fetch(`/data/subdivisiones/${iso2}.json`).then((r) => r.json()),
      ])
    ),
  ])
  if (viajesError) console.error('No se pudieron cargar los viajes para el globo', viajesError)
  const viajes = viajesData ?? []
  const nombres = new Map(paises.map((p) => [p.iso_a3, p.nombre_es]))

  // El país entero (capa base) solo se colorea con los viajes que no listan ninguna
  // subdivisión concreta — si el usuario eligió una provincia, esa se pinta aparte.
  const estadoPaises = estadoPorPais(viajes.filter((v) => !v.subdivisiones?.length))
  const estadoSub = estadoPorSubdivision(viajes)

  // Nombre + país de cada subdivisión, y solo las features de subdivisión con datos
  // propios (no hace falta renderizar las que nadie ha visitado: el relleno del país
  // debajo ya se ve).
  const nombreSubdivision = new Map()
  const featuresSubdivisiones = []
  subdivisionesPorPais.forEach(([subGeo, subLista], i) => {
    const paisIso = paises.find((p) => p.iso_a2 === PAISES_CON_SUBDIVISION[i])?.iso_a3
    for (const s of subLista) nombreSubdivision.set(s.codigo_iso_3166_2, s.nombre)
    for (const f of subGeo.features) {
      if (estadoSub.has(f.properties.codigo_iso_3166_2)) {
        // Los ficheros de subdivisiones traen bobinado mixto entre piezas de un mismo
        // MultiPolygon (mapshaper -dissolve). Mezclarlo con el sentido de paises.geojson
        // en el mismo polygonsData corrompe el render del globo entero — normalizar
        // antes de combinarlas.
        featuresSubdivisiones.push({
          ...f,
          properties: { ...f.properties, iso_a3: paisIso },
          geometry: normalizarBobinado(f.geometry),
        })
      }
    }
  })

  const esSubdivision = (f) => f.properties.codigo_iso_3166_2 !== undefined

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
    const info = esSubdivision(feature)
      ? estadoSub.get(feature.properties.codigo_iso_3166_2)
      : estadoPaises.get(feature.properties.iso_a3)
    if (!info) return materialNoVisitado
    if (info.estado === 'visitado') return materialVisitado
    return materialEscala(feature)
  }

  function etiquetaPara(feature) {
    const info = esSubdivision(feature)
      ? estadoSub.get(feature.properties.codigo_iso_3166_2)
      : estadoPaises.get(feature.properties.iso_a3)
    const nombrePais = nombres.get(feature.properties.iso_a3) ?? feature.properties.iso_a3
    const nombre = esSubdivision(feature)
      ? `${nombreSubdivision.get(feature.properties.codigo_iso_3166_2)}, ${nombrePais}`
      : nombrePais
    return info
      ? `${nombre}, ${info.estado}, ${info.viajes} viaje${info.viajes === 1 ? '' : 's'}`
      : `${nombre}, no visitado`
  }

  const globe = Globe()(el)
    .width(window.innerWidth)
    .height(window.innerHeight)
    .backgroundColor(css('--sky'))
    .showAtmosphere(false)
    .polygonsData([...geo.features, ...featuresSubdivisiones])
    .polygonCapMaterial((f) => materialPara(f))
    .polygonSideColor(() => 'rgba(0,0,0,0)')
    .polygonStrokeColor(() => css('--ink'))
    .polygonAltitude((f) => (esSubdivision(f) ? ALTITUD_SUBDIVISION : ALTITUD_PAIS))
    .onPolygonClick((f) => {
      label.textContent = etiquetaPara(f)
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
