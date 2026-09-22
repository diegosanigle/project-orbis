// Suavizado por corte de esquinas (Chaikin) para GeoJSON. Los puntos donde confluyen más
// de dos vecinos (uniones entre polígonos o con costa) quedan fijos, para que las
// fronteras compartidas se suavicen idénticas en ambos lados y sigan encajando.
// Usado por build-paises.js (los 249 países entre sí) y build-subdivisiones.js (las
// provincias de un país entre sí), cada uno con su propio FeatureCollection.
const clave = (p) => `${p[0]},${p[1]}`
const mezcla = (a, b, t) => [a[0] * (1 - t) + b[0] * t, a[1] * (1 - t) + b[1] * t]
const chaikinAbierto = (pts) => {
  const out = [pts[0]]
  for (let i = 0; i < pts.length - 1; i++) out.push(mezcla(pts[i], pts[i + 1], 0.25), mezcla(pts[i], pts[i + 1], 0.75))
  out.push(pts[pts.length - 1])
  return out
}
const chaikinCerrado = (pts) => pts.flatMap((a, i) => [mezcla(a, pts[(i + 1) % pts.length], 0.25), mezcla(a, pts[(i + 1) % pts.length], 0.75)])

export function suavizar(fc, iteraciones) {
  const anillos = fc.features.flatMap((f) => (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates).flat())
  const vecinos = new Map()
  for (const r of anillos) {
    const n = r.length - 1
    for (let i = 0; i < n; i++) {
      const k = clave(r[i])
      if (!vecinos.has(k)) vecinos.set(k, new Set())
      vecinos.get(k).add(clave(r[(i + n - 1) % n])).add(clave(r[(i + 1) % n]))
    }
  }
  const esNodo = (p) => vecinos.get(clave(p)).size > 2
  const suavizarAnillo = (anillo) => {
    const pts = anillo.slice(0, -1)
    const primero = pts.findIndex(esNodo)
    if (primero < 0) {
      let c = pts
      for (let i = 0; i < iteraciones; i++) c = chaikinCerrado(c)
      return [...c, c[0]]
    }
    const rot = [...pts.slice(primero), ...pts.slice(0, primero)]
    const nodos = rot.map((p, i) => (esNodo(p) ? i : -1)).filter((i) => i >= 0)
    const out = []
    nodos.forEach((a, k) => {
      const b = k + 1 < nodos.length ? nodos[k + 1] : rot.length
      let arco = rot.slice(a, b + 1)
      if (b === rot.length) arco.push(rot[0])
      for (let i = 0; i < iteraciones; i++) arco = chaikinAbierto(arco)
      out.push(...(k === 0 ? arco : arco.slice(1)))
    })
    return out
  }
  for (const f of fc.features) {
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates
    for (const poly of polys) poly.forEach((anillo, i) => (poly[i] = suavizarAnillo(anillo)))
  }
  return fc
}
