// Timeline: orden cronológico y filtro por año. Funciones puras.

// Año del viaje según su fecha de inicio ('YYYY-MM-DD').
const anioDe = (viaje) => Number(viaje.fecha_inicio.slice(0, 4))

// Años con al menos un viaje, del más reciente al más antiguo.
export function aniosConViajes(viajes) {
  return [...new Set(viajes.map(anioDe))].sort((a, b) => b - a)
}

// Viajes más recientes primero. `anio` null/undefined = todos.
export function viajesDelTimeline(viajes, anio = null) {
  return viajes
    .filter((v) => anio == null || anioDe(v) === anio)
    .sort((a, b) => b.fecha_inicio.localeCompare(a.fecha_inicio))
}
