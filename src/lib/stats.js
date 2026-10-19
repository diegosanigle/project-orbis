// % países, % superficie, nº países, contador de transitados
import { estadoPorPais } from './geo.js'

// `paises`: contenido de paises.json (los 249 ISO 3166-1). El denominador de ambos
// porcentajes sale de ahí: visitar los 249 da exactamente 100 %.
// Solo cuentan las visitas: una escala no suma a países, superficie ni continentes
// (PLAN.md §2), solo al contador de transitados. Si un país tiene visita y escala,
// prevalece la visita (estadoPorPais).
export function calcularStats(viajes, paises) {
  const estado = estadoPorPais(viajes)
  const visitado = (p) => estado.get(p.iso_a3)?.estado === 'visitado'

  const visitados = paises.filter(visitado)
  const areaTotalKm2 = paises.reduce((s, p) => s + p.area_km2, 0)
  const areaVisitadaKm2 = visitados.reduce((s, p) => s + p.area_km2, 0)
  const pct = (parte, total) => (total === 0 ? 0 : (parte / total) * 100)

  const continentes = new Map()
  for (const p of paises) {
    const c = continentes.get(p.continente) ?? { continente: p.continente, visitados: 0, total: 0 }
    c.total += 1
    if (visitado(p)) c.visitados += 1
    continentes.set(p.continente, c)
  }

  return {
    paisesVisitados: visitados.length,
    paisesTotal: paises.length,
    porcentajePaises: pct(visitados.length, paises.length),
    areaVisitadaKm2,
    areaTotalKm2,
    porcentajeSuperficie: pct(areaVisitadaKm2, areaTotalKm2),
    paisesTransitados: paises.filter((p) => estado.get(p.iso_a3)?.estado === 'escala').length,
    porContinente: [...continentes.values()].sort((a, b) => a.continente.localeCompare(b.continente, 'es')),
  }
}

// Países por nº de viajes de tipo visita, de más a menos (empate: orden alfabético del
// código ISO, para que el resultado sea determinista). Las escalas no cuentan: son tránsito.
export function paisesMasRepetidos(viajes) {
  const cuenta = new Map()
  for (const v of viajes) if (v.tipo === 'visita') cuenta.set(v.pais_iso, (cuenta.get(v.pais_iso) ?? 0) + 1)
  return [...cuenta.entries()]
    .map(([pais_iso, viajes]) => ({ pais_iso, viajes }))
    .sort((a, b) => b.viajes - a.viajes || a.pais_iso.localeCompare(b.pais_iso))
}

// Viajes de tipo visita por año de `fecha_inicio`, del más reciente al más antiguo.
export function viajesPorAnio(viajes) {
  const cuenta = new Map()
  for (const v of viajes) {
    if (v.tipo !== 'visita') continue
    const anio = Number(v.fecha_inicio.slice(0, 4))
    cuenta.set(anio, (cuenta.get(anio) ?? 0) + 1)
  }
  return [...cuenta.entries()].map(([anio, viajes]) => ({ anio, viajes })).sort((a, b) => b.anio - a.anio)
}
