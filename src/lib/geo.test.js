import { describe, expect, it } from 'vitest'
import { banderaEmoji, bboxGrados, estadoPorPais, estadoPorSubdivision, filasPaises, filtrarFilas, normalizarBobinado } from './geo.js'

describe('estadoPorPais', () => {
  it('marca visitado con un solo viaje de tipo visita', () => {
    const estado = estadoPorPais([{ pais_iso: 'ESP', tipo: 'visita' }])
    expect(estado.get('ESP')).toEqual({ estado: 'visitado', viajes: 1 })
  })

  it('marca escala cuando solo hay tránsitos', () => {
    const estado = estadoPorPais([{ pais_iso: 'USA', tipo: 'escala' }])
    expect(estado.get('USA')).toEqual({ estado: 'escala', viajes: 1 })
  })

  it('un país sin viajes no tiene entrada (no se guarda "no visitado")', () => {
    const estado = estadoPorPais([{ pais_iso: 'ESP', tipo: 'visita' }])
    expect(estado.has('FRA')).toBe(false)
  })

  it('visitar el mismo país varias veces cuenta una sola vez como estado', () => {
    const estado = estadoPorPais([
      { pais_iso: 'ESP', tipo: 'visita' },
      { pais_iso: 'ESP', tipo: 'visita' },
    ])
    expect(estado.get('ESP')).toEqual({ estado: 'visitado', viajes: 2 })
  })

  it('visita prevalece sobre escala sin importar el orden', () => {
    const escalaLuego = estadoPorPais([
      { pais_iso: 'GBR', tipo: 'visita' },
      { pais_iso: 'GBR', tipo: 'escala' },
    ])
    expect(escalaLuego.get('GBR').estado).toBe('visitado')

    const visitaLuego = estadoPorPais([
      { pais_iso: 'GBR', tipo: 'escala' },
      { pais_iso: 'GBR', tipo: 'visita' },
    ])
    expect(visitaLuego.get('GBR').estado).toBe('visitado')
  })
})

describe('estadoPorSubdivision', () => {
  it('marca cada subdivisión listada en un viaje', () => {
    const estado = estadoPorSubdivision([
      { tipo: 'visita', subdivisiones: ['ES-A', 'ES-M'] },
    ])
    expect(estado.get('ES-A')).toEqual({ estado: 'visitado', viajes: 1 })
    expect(estado.get('ES-M')).toEqual({ estado: 'visitado', viajes: 1 })
  })

  it('ignora viajes sin subdivisiones', () => {
    const estado = estadoPorSubdivision([{ tipo: 'visita', subdivisiones: [] }, { tipo: 'visita' }])
    expect(estado.size).toBe(0)
  })

  it('visita prevalece sobre escala también a nivel subdivisión', () => {
    const estado = estadoPorSubdivision([
      { tipo: 'escala', subdivisiones: ['US-NY'] },
      { tipo: 'visita', subdivisiones: ['US-NY'] },
    ])
    expect(estado.get('US-NY')).toEqual({ estado: 'visitado', viajes: 2 })
  })
})

describe('normalizarBobinado', () => {
  // Cuadrado en sentido horario (antihorario invertido): referencia "ya correcta".
  const cuadradoHorario = [[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]
  const cuadradoAntihorario = [...cuadradoHorario].reverse()

  it('deja igual un anillo que ya tiene el sentido correcto', () => {
    const geometry = { type: 'Polygon', coordinates: [cuadradoHorario] }
    expect(normalizarBobinado(geometry).coordinates).toEqual([cuadradoHorario])
  })

  it('invierte un anillo con el sentido opuesto', () => {
    const geometry = { type: 'Polygon', coordinates: [cuadradoAntihorario] }
    expect(normalizarBobinado(geometry).coordinates).toEqual([cuadradoHorario])
  })

  it('normaliza cada pieza de un MultiPolygon con bobinado mixto (caso Escocia)', () => {
    const geometry = { type: 'MultiPolygon', coordinates: [[cuadradoHorario], [cuadradoAntihorario]] }
    expect(normalizarBobinado(geometry).coordinates).toEqual([[cuadradoHorario], [cuadradoHorario]])
  })
})

describe('bboxGrados', () => {
  it('calcula el ancho/alto de un Polygon simple', () => {
    const geometry = {
      type: 'Polygon',
      coordinates: [[[0, 0], [10, 0], [10, 5], [0, 5], [0, 0]]],
    }
    expect(bboxGrados(geometry)).toEqual({ anchoLng: 10, altoLat: 5 })
  })

  it('da el ancho real en un país que cruza el antimeridiano', () => {
    // Rusia: mayoría al este (hasta ~180°) + una franja al oeste del meridiano 180
    // (Chukotka, ~-169°). Sin corrección, min/max ingenuo da 360° de ancho.
    const geometry = {
      type: 'MultiPolygon',
      coordinates: [
        [[[19, 55], [180, 55], [180, 70], [19, 70], [19, 55]]],
        [[[-179, 65], [-169, 65], [-169, 70], [-179, 70], [-179, 65]]],
      ],
    }
    const { anchoLng } = bboxGrados(geometry)
    expect(anchoLng).toBeCloseTo(172, 5)
  })

  it('cubre todos los polígonos de un MultiPolygon', () => {
    const geometry = {
      type: 'MultiPolygon',
      coordinates: [
        [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]],
        [[[10, 10], [12, 10], [12, 12], [10, 12], [10, 10]]],
      ],
    }
    expect(bboxGrados(geometry)).toEqual({ anchoLng: 12, altoLat: 12 })
  })
})

describe('banderaEmoji', () => {
  it('convierte ISO alfa-2 en emoji de bandera', () => {
    expect(banderaEmoji('ES')).toBe('🇪🇸')
  })
  it('devuelve vacío si el código no es válido', () => {
    expect(banderaEmoji(undefined)).toBe('')
    expect(banderaEmoji('xx')).toBe('')
  })
})

describe('filasPaises / filtrarFilas', () => {
  const paises = [
    { iso_a3: 'ESP', iso_a2: 'ES', nombre_es: 'España' },
    { iso_a3: 'FRA', iso_a2: 'FR', nombre_es: 'Francia' },
    { iso_a3: 'ALB', iso_a2: 'AL', nombre_es: 'Albania' },
  ]
  const viajes = [
    { pais_iso: 'ESP', tipo: 'visita', subdivisiones: ['ES-M'] },
    { pais_iso: 'FRA', tipo: 'escala', subdivisiones: [] },
  ]
  const filas = filasPaises(paises, viajes)

  it('devuelve todos los países ordenados por nombre con su estado', () => {
    expect(filas.map((f) => [f.nombre_es, f.estado])).toEqual([
      ['Albania', 'no visitado'],
      ['España', 'visitado'],
      ['Francia', 'escala'],
    ])
  })
  it('incluye las subdivisiones visitadas del país', () => {
    expect(filas.find((f) => f.iso_a3 === 'ESP').subdivisiones).toEqual([{ codigo: 'ES-M', estado: 'visitado', viajes: 1 }])
  })
  it('filtra por estado y por texto ignorando tildes y mayúsculas', () => {
    expect(filtrarFilas(filas, { estado: 'escala' }).map((f) => f.iso_a3)).toEqual(['FRA'])
    expect(filtrarFilas(filas, { texto: 'ESPANA' }).map((f) => f.iso_a3)).toEqual(['ESP'])
  })
})
