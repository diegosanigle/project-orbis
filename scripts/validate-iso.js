// Cruza códigos ISO entre los GeoJSON y los JSON de public/data (PLAN.md §7) y comprueba las áreas.
// Uso: node scripts/validate-iso.js   (sale con código 1 si algo no cuadra)
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const data = join(dirname(fileURLToPath(import.meta.url)), '..', 'public/data')
const read = (f) => JSON.parse(readFileSync(join(data, f), 'utf8'))

const SUPERFICIE_TERRESTRE_KM2 = 148_940_000
const TOLERANCIA = 0.03
let errores = 0
const fallo = (msg) => {
  errores++
  console.error(`✗ ${msg}`)
}

const paises = read('paises.json')
const geo = read('paises.geojson')
const json = new Set(paises.map((p) => p.iso_a3))
const poligonos = geo.features.map((f) => f.properties.iso_a3)

if (json.size !== paises.length) fallo('paises.json tiene iso_a3 duplicados')
if (paises.length !== 249) fallo(`paises.json tiene ${paises.length} entradas, se esperaban 249`)
if (new Set(poligonos).size !== poligonos.length) fallo('paises.geojson tiene iso_a3 duplicados')
for (const p of paises) if (!(p.area_km2 > 0)) fallo(`Área inválida: ${p.iso_a3}`)

const geoSinJson = poligonos.filter((c) => !json.has(c))
const jsonSinGeo = [...json].filter((c) => !poligonos.includes(c))
if (geoSinJson.length) fallo(`En GeoJSON pero no en paises.json: ${geoSinJson.join(' ')}`)
console.log(`ℹ En paises.json sin polígono (solo lista, esperado): ${jsonSinGeo.join(' ') || '—'}`)

const suma = paises.reduce((s, p) => s + p.area_km2, 0)
const desvio = Math.abs(suma - SUPERFICIE_TERRESTRE_KM2) / SUPERFICIE_TERRESTRE_KM2
console.log(`ℹ Suma de áreas: ${Math.round(suma).toLocaleString('es-ES')} km² (${(desvio * 100).toFixed(2)}% de desvío sobre ${SUPERFICIE_TERRESTRE_KM2.toLocaleString('es-ES')})`)
if (desvio > TOLERANCIA) fallo('La suma de áreas se aleja demasiado de la superficie terrestre')

const SUBS = ['ES', 'PT', 'FR', 'IT', 'US']
for (const c of SUBS) {
  if (!existsSync(join(data, 'subdivisiones', `${c}.json`))) continue
  const lista = read(`subdivisiones/${c}.json`)
  const codigos = new Set(lista.map((s) => s.codigo_iso_3166_2))
  const geoSub = read(`subdivisiones/${c}.geojson`).features.map((f) => f.properties.codigo_iso_3166_2)
  const a = geoSub.filter((x) => !codigos.has(x))
  const b = [...codigos].filter((x) => !geoSub.includes(x))
  if (a.length) fallo(`${c}: en GeoJSON pero no en JSON: ${a.join(' ')}`)
  if (b.length) fallo(`${c}: en JSON pero no en GeoJSON: ${b.join(' ')}`)
}

console.log(errores ? `\n${errores} error(es)` : '\n✓ Todo cruza')
process.exit(errores ? 1 : 0)
