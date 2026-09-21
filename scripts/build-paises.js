// Genera public/data/paises.json y paises.geojson (PLAN.md, Fase 2).
// Uso: node scripts/build-paises.js   (descarga las fuentes a scripts/.cache la primera vez)
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const cache = join(root, 'scripts/.cache')
const out = join(root, 'public/data')

const SOURCES = {
  'ne_50m_admin_0_map_units.geojson':
    'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_map_units.geojson',
  'countries.json': 'https://raw.githubusercontent.com/mledoze/countries/master/countries.json',
}

// map_units (no countries) separa GUF, GLP, MTQ, REU, MYT, BES y SJM de FRA/NLD/NOR, como exige el modelo ISO independiente.
// Unidades sin código ISO oficial: se fusionan con el país que las reclama (decisión: solo los 249 oficiales).
// Jan Mayen comparte código con Svalbard (SJM); Gaza y Cisjordania son PSE.
const MERGE_INTO = { KOS: 'SRB', SOL: 'SOM', CYN: 'CYP', NJM: 'SJM', GAZ: 'PSE', WEB: 'PSE' }
// La fuente trae -1 para SJM (Svalbard y Jan Mayen); valor manual, ≈62.422 km².
const AREA_OVERRIDE = { SJM: 62422 }
const EXCLUDE_UNOFFICIAL = new Set(['UNK'])

async function load(name) {
  const path = join(cache, name)
  if (!existsSync(path)) {
    mkdirSync(cache, { recursive: true })
    const res = await fetch(SOURCES[name])
    if (!res.ok) throw new Error(`Descarga fallida: ${name} (${res.status})`)
    writeFileSync(path, Buffer.from(await res.arrayBuffer()))
  }
  return JSON.parse(readFileSync(path, 'utf8'))
}

function continente(c) {
  if (c.region === 'Americas') return c.subregion === 'South America' ? 'América del Sur' : 'América del Norte'
  const map = { Africa: 'África', Asia: 'Asia', Europe: 'Europa', Oceania: 'Oceanía', Antarctic: 'Antártida' }
  if (!map[c.region]) throw new Error(`Región desconocida: ${c.cca3} ${c.region}`)
  return map[c.region]
}

const round = (n) => Math.round(n * 100) / 100
const roundCoords = (x) => (typeof x[0] === 'number' ? x.map(round) : x.map(roundCoords))
const polygons = (g) => (g.type === 'Polygon' ? [g.coordinates] : g.coordinates)

const [ne, list] = await Promise.all([load('ne_50m_admin_0_map_units.geojson'), load('countries.json')])

const paises = list
  .filter((c) => !EXCLUDE_UNOFFICIAL.has(c.cca3))
  .map((c) => ({
    iso_a3: c.cca3,
    iso_a2: c.cca2,
    nombre_es: c.translations.spa.common,
    continente: continente(c),
    area_km2: AREA_OVERRIDE[c.cca3] ?? c.area,
  }))
  .sort((a, b) => a.iso_a3.localeCompare(b.iso_a3))

const byIso = new Map()
// ISO_A3 vale -99 en unidades como Noruega, Escocia o Madeira: se usa ISO_A3_EH solo si la unidad es la principal de ese país.
const iso = (p) => {
  if (MERGE_INTO[p.SU_A3]) return MERGE_INTO[p.SU_A3]
  if (p.ISO_A3 !== '-99') return p.ISO_A3
  return p.ADM0_A3 === p.ISO_A3_EH ? p.ISO_A3_EH : null
}
const dropped = []
for (const f of ne.features) {
  const p = f.properties
  const code = iso(p)
  if (!code) {
    dropped.push(p.NAME)
    continue
  }
  if (!byIso.has(code)) byIso.set(code, [])
  byIso.get(code).push(...polygons(f.geometry))
}

const valid = new Set(paises.map((p) => p.iso_a3))
const features = []
for (const [code, polys] of byIso) {
  if (!valid.has(code)) continue
  features.push({
    type: 'Feature',
    properties: { iso_a3: code },
    geometry: { type: 'MultiPolygon', coordinates: roundCoords(polys) },
  })
}
features.sort((a, b) => a.properties.iso_a3.localeCompare(b.properties.iso_a3))

writeFileSync(join(out, 'paises.json'), JSON.stringify(paises, null, 1) + '\n')
// Simplificación para el globo (rendimiento en iPhone): sin islotes menores que MIN_ISLA_KM2 (salvo el polígono
// mayor de cada país, para que ninguno desaparezca) y con vértices reducidos.
const MIN_ISLA_KM2 = 150
const SIMPLIFICAR = '20%'
const areaKm2 = (ring) => {
  let a = 0
  for (let i = 0; i < ring.length - 1; i++) a += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1]
  const lat = ring.reduce((s, c) => s + c[1], 0) / ring.length
  return Math.abs(a / 2) * 111.32 * 111.32 * Math.cos((lat * Math.PI) / 180)
}
for (const f of features) {
  const conArea = f.geometry.coordinates.map((poly) => ({ poly, km2: areaKm2(poly[0]) }))
  const mayor = Math.max(...conArea.map((x) => x.km2))
  f.geometry.coordinates = conArea.filter((x) => x.km2 >= MIN_ISLA_KM2 || x.km2 === mayor).map((x) => x.poly)
}
const tmp = join(cache, 'paises_raw.geojson')
writeFileSync(tmp, JSON.stringify({ type: 'FeatureCollection', features }))
execFileSync(
  join(root, 'node_modules/.bin/mapshaper'),
  [tmp, '-simplify', SIMPLIFICAR, 'weighting=1', 'keep-shapes',
   '-o', join(out, 'paises.geojson'), 'format=geojson', 'precision=0.01', 'force'],
  { stdio: ['ignore', 'ignore', 'inherit'] },
)

// globe.gl (d3-geo) espera exteriores en sentido horario y huecos antihorarios; mapshaper los deja al revés.
const signedArea = (r) => r.reduce((a, c, i) => (i < r.length - 1 ? a + c[0] * r[i + 1][1] - r[i + 1][0] * c[1] : a), 0)
const simplificado = JSON.parse(readFileSync(join(out, 'paises.geojson'), 'utf8'))
for (const f of simplificado.features) {
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates
  for (const poly of polys) {
    poly.forEach((ring, i) => {
      const horario = signedArea(ring) < 0
      if (horario !== (i === 0)) ring.reverse()
    })
  }
}
writeFileSync(join(out, 'paises.geojson'), JSON.stringify(simplificado))

const sinPoligono = paises.filter((p) => !byIso.has(p.iso_a3)).map((p) => p.iso_a3)
console.log(`paises.json: ${paises.length} entradas`)
console.log(`paises.geojson: ${features.length} polígonos`)
console.log(`Descartadas (sin ISO): ${dropped.join(', ')}`)
console.log(`Sin polígono (solo lista): ${sinPoligono.length} → ${sinPoligono.join(' ')}`)
