import { describe, expect, it } from 'vitest'
import { bboxGrados, estadoPorPais } from './geo.js'

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
