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
