// Genera public/data/subdivisiones/{ES,PT,FR,IT,US}.{geojson,json} (PLAN.md, Fase 2).
// Uso: node scripts/build-subdivisiones.js   (requiere `npm install`; descarga Natural Earth admin-1 a scripts/.cache)
// Niveles: ES provincias, PT distritos + Azores/Madeira, FR régions (metropolitanas), IT regioni, US estados + DC.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const cache = join(root, 'scripts/.cache')
const out = join(root, 'public/data/subdivisiones')
const mapshaper = join(root, 'node_modules/.bin/mapshaper')
const SRC = 'ne_10m_admin_1.geojson'
const URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson'

// Natural Earth trae provincias en ES/PT, departamentos en FR y provincias en IT: FR e IT se disuelven a región.
const PAISES = {
  ES: { adm0: 'ESP', simplify: '8%' },
  PT: { adm0: 'PRT', simplify: '8%' },
  FR: { adm0: 'FRA', simplify: '8%', region: true },
  IT: { adm0: 'ITA', simplify: '8%', region: true },
  US: { adm0: 'USA', simplify: '4%' },
}

// Nombres oficiales actuales (Natural Earth usa las formas castellanizadas antiguas).
const NOMBRES_ES = {
  'ES-L': 'Lleida', 'ES-GI': 'Girona', 'ES-OR': 'Ourense', 'ES-C': 'A Coruña', 'ES-SS': 'Gipuzkoa', 'ES-BI': 'Bizkaia',
}

// Códigos ISO 3166-2 de las régions (NE usa region_cod propios, con algún tabulador suelto) y de las regioni.
const REGIONES = {
  FR: {
    'FR-HDF': 'Alta Francia', 'FR-GES': 'Gran Este', 'FR-PAC': 'Provenza-Alpes-Costa Azul', 'FR-ARA': 'Auvernia-Ródano-Alpes',
    'FR-NAQ': 'Nueva Aquitania', 'FR-OCC': 'Occitania', 'FR-BFC': 'Borgoña-Franco Condado', 'FR-PDL': 'País del Loira',
    'FR-BRE': 'Bretaña', 'FR-NOR': 'Normandía', 'FR-COR': 'Córcega', 'FR-CVL': 'Centro-Valle del Loira', 'FR-IDF': 'Isla de Francia',
  },
  IT: {
    'IT-21': 'Piamonte', 'IT-23': 'Valle de Aosta', 'IT-25': 'Lombardía', 'IT-32': 'Trentino-Alto Adigio', 'IT-34': 'Véneto',
    'IT-36': 'Friuli-Venecia Julia', 'IT-42': 'Liguria', 'IT-45': 'Emilia-Romaña', 'IT-52': 'Toscana', 'IT-55': 'Umbría',
    'IT-57': 'Marcas', 'IT-62': 'Lacio', 'IT-65': 'Abruzos', 'IT-67': 'Molise', 'IT-72': 'Campania', 'IT-75': 'Apulia',
    'IT-77': 'Basilicata', 'IT-78': 'Calabria', 'IT-82': 'Sicilia', 'IT-88': 'Cerdeña',
  },
}

async function cargar() {
  const path = join(cache, SRC)
  if (!existsSync(path)) {
    mkdirSync(cache, { recursive: true })
    const res = await fetch(URL)
    if (!res.ok) throw new Error(`Descarga fallida (${res.status})`)
    writeFileSync(path, Buffer.from(await res.arrayBuffer()))
  }
  return JSON.parse(readFileSync(path, 'utf8'))
}

const ne = await cargar()
mkdirSync(out, { recursive: true })

for (const [pais, cfg] of Object.entries(PAISES)) {
  const tabla = REGIONES[pais]
  const features = []
  for (const f of ne.features) {
    const p = f.properties
    if (p.adm0_a3 !== cfg.adm0) continue
    let codigo = p.iso_3166_2.trim()
    let nombre = p.name_es || p.name
    if (cfg.region) {
      codigo = (p.region_cod ?? '').trim().replace(/^FR-GUF|^FR-MTQ|^FR-GUA|^FR-LRE|^FR-MAY/, '')
      if (!codigo) continue // ultramar francés: ya son países propios en paises.json
      nombre = tabla[codigo]
      if (!nombre) throw new Error(`${pais}: región sin mapear ${codigo}`)
    }
    features.push({ type: 'Feature', properties: { codigo_iso_3166_2: codigo, nombre: NOMBRES_ES[codigo] ?? nombre }, geometry: f.geometry })
  }

  const tmp = join(cache, `sub_${pais}.geojson`)
  writeFileSync(tmp, JSON.stringify({ type: 'FeatureCollection', features }))
  const args = [tmp]
  if (cfg.region) args.push('-dissolve', 'codigo_iso_3166_2', 'copy-fields=nombre')
  args.push('-each', 'area_km2=Math.round($.area/1e6)', '-simplify', cfg.simplify, 'keep-shapes',
    '-o', join(out, `${pais}.geojson`), 'format=geojson', 'precision=0.01', 'force')
  execFileSync(mapshaper, args, { stdio: ['ignore', 'ignore', 'inherit'] })

  const res = JSON.parse(readFileSync(join(out, `${pais}.geojson`), 'utf8'))
  const lista = res.features
    .map((f) => ({ codigo_iso_3166_2: f.properties.codigo_iso_3166_2, nombre: f.properties.nombre, pais_iso: cfg.adm0, area_km2: f.properties.area_km2 }))
    .sort((a, b) => a.codigo_iso_3166_2.localeCompare(b.codigo_iso_3166_2))
  // El GeoJSON solo lleva el código; nombre y área viven en el JSON.
  for (const f of res.features) f.properties = { codigo_iso_3166_2: f.properties.codigo_iso_3166_2 }
  writeFileSync(join(out, `${pais}.geojson`), JSON.stringify(res))
  writeFileSync(join(out, `${pais}.json`), JSON.stringify(lista, null, 1) + '\n')
  const kb = Math.round(Buffer.byteLength(JSON.stringify(res)) / 1024)
  console.log(`${pais}: ${lista.length} entidades, ${kb} KB`)
}
