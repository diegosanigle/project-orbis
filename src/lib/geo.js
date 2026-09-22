// Cruce pais_iso ↔ GeoJSON, carga perezosa de subdivisiones

// El estado "visitado" nunca se almacena: se deriva siempre de los viajes (PLAN.md §5).
// `visita` prevalece sobre `escala` si un país tiene ambos (PLAN.md §7, caso límite).
export function estadoPorPais(viajes) {
  const resultado = new Map()
  for (const v of viajes) {
    const actual = resultado.get(v.pais_iso) ?? { estado: null, viajes: 0 }
    actual.viajes += 1
    if (v.tipo === 'visita') actual.estado = 'visitado'
    else if (actual.estado !== 'visitado') actual.estado = 'escala'
    resultado.set(v.pais_iso, actual)
  }
  return resultado
}

// Estado por subdivisión (ES/PT/FR/IT/US/GB): igual que estadoPorPais pero a partir del
// array `subdivisiones` de cada viaje — un viaje puede cubrir varias a la vez. El país
// entero se pinta aparte, en la capa base, solo con los viajes que no listan ninguna
// subdivisión (ver estadoPorPais llamada con ese filtro en globe.js).
export function estadoPorSubdivision(viajes) {
  const resultado = new Map()
  for (const v of viajes) {
    for (const codigo of v.subdivisiones ?? []) {
      const actual = resultado.get(codigo) ?? { estado: null, viajes: 0 }
      actual.viajes += 1
      if (v.tipo === 'visita') actual.estado = 'visitado'
      else if (actual.estado !== 'visitado') actual.estado = 'escala'
      resultado.set(codigo, actual)
    }
  }
  return resultado
}

// Tamaño angular (grados) del bounding box de un Polygon/MultiPolygon GeoJSON.
// Usado para calibrar la densidad de la trama de puntos de "escala" en el globo:
// cada país tiene su propio UV 0-1 (three-globe), así que el `repeat` de la textura
// debe ser proporcional a este tamaño para que la densidad de puntos sea consistente.
export function bboxGrados(geometry) {
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity
  let minLngDesplazada = Infinity, maxLngDesplazada = -Infinity
  const anillos = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  for (const poligono of anillos) {
    for (const anillo of poligono) {
      for (const [lng, lat] of anillo) {
        if (lng < minLng) minLng = lng
        if (lng > maxLng) maxLng = lng
        // Copia con longitudes negativas desplazadas a 0-360: da el ancho correcto
        // cuando el país cruza el antimeridiano (p.ej. Rusia), donde min/max sin
        // desplazar daría ~360° en vez de su extensión real.
        const lngDesplazada = lng < 0 ? lng + 360 : lng
        if (lngDesplazada < minLngDesplazada) minLngDesplazada = lngDesplazada
        if (lngDesplazada > maxLngDesplazada) maxLngDesplazada = lngDesplazada
        if (lat < minLat) minLat = lat
        if (lat > maxLat) maxLat = lat
      }
    }
  }
  const anchoLng = Math.min(maxLng - minLng, maxLngDesplazada - minLngDesplazada)
  return { anchoLng, altoLat: maxLat - minLat }
}

function areaConSigno(anillo) {
  let suma = 0
  for (let i = 0; i < anillo.length - 1; i++) {
    const [x1, y1] = anillo[i]
    const [x2, y2] = anillo[i + 1]
    suma += (x2 - x1) * (y2 + y1)
  }
  return suma
}

// Normaliza el sentido de cada anillo al mismo signo que usa paises.geojson (positivo).
// Los ficheros de subdivisiones (disueltos con mapshaper en scripts/build-subdivisiones.js)
// traen bobinado mixto entre piezas de un mismo MultiPolygon. Mezclar polígonos con
// bobinado opuesto en el mismo polygonsData de three-globe corrompe el render del globo
// entero (no solo el de la pieza afectada) — verificado a mano antes de este fix.
export function normalizarBobinado(geometry) {
  const normalizarAnillo = (anillo) => (areaConSigno(anillo) < 0 ? [...anillo].reverse() : anillo)
  if (geometry.type === 'Polygon') {
    return { ...geometry, coordinates: geometry.coordinates.map(normalizarAnillo) }
  }
  return { ...geometry, coordinates: geometry.coordinates.map((poligono) => poligono.map(normalizarAnillo)) }
}
