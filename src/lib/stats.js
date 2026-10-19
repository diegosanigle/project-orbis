// % países, % superficie, nº países, contador de transitados
import { estadoPorPais } from './geo.js'

// `paises`: contenido de paises.json (los 249 ISO 3166-1). El denominador de ambos
// porcentajes sale de ahí: visitar los 249 da exactamente 100 %.
// `subdivisiones`: filas de los subdivisiones/*.json ({ codigo_iso_3166_2, pais_iso, area_km2 }).
//
// Solo cuentan las visitas: una escala no suma a países, superficie ni continentes
// (PLAN.md §2), solo al contador de transitados. Si un país tiene visita y escala,
// prevalece la visita (estadoPorPais).
//
// Un país con visitas cuenta 1 en el nº y % de países. En superficie, en cambio, un viaje
// que lista subdivisiones suma solo el área de esas subdivisiones; un viaje sin
// subdivisión suma el país entero, y ese gana si coexiste con viajes a subdivisiones.
export function calcularStats(viajes, paises, subdivisiones = []) {
  const estado = estadoPorPais(viajes)
  const visitado = (p) => estado.get(p.iso_a3)?.estado === 'visitado'

  const areaSub = new Map(subdivisiones.map((s) => [s.codigo_iso_3166_2, s.area_km2]))
  const visitas = viajes.filter((v) => v.tipo === 'visita')

  function areaVisitada(p) {
    const deEstePais = visitas.filter((v) => v.pais_iso === p.iso_a3)
    if (deEstePais.some((v) => !v.subdivisiones?.length)) return p.area_km2
    const codigos = new Set(deEstePais.flatMap((v) => v.subdivisiones))
    const suma = [...codigos].reduce((s, c) => s + (areaSub.get(c) ?? 0), 0)
    // Las áreas de subdivisión y de país vienen de fuentes distintas: se acota al país
    // para que visitarlas todas no pase del 100 % de ese país. Sin área conocida de las
    // subdivisiones, se cuenta el país entero.
    return suma === 0 ? p.area_km2 : Math.min(suma, p.area_km2)
  }

  const visitados = paises.filter(visitado)
  const areaTotalKm2 = paises.reduce((s, p) => s + p.area_km2, 0)
  const areaVisitadaKm2 = visitados.reduce((s, p) => s + areaVisitada(p), 0)
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
