import { describe, expect, it } from 'vitest'
import { calcularStats } from './stats.js'

// Fixture pequeña con cifras redondas para poder verificar los resultados a mano.
// Superficie total: 500.000 + 500.000 + 9.000.000 + 1.000.000 = 11.000.000 km².
const paises = [
  { iso_a3: 'ESP', continente: 'Europa', area_km2: 500000 },
  { iso_a3: 'FRA', continente: 'Europa', area_km2: 500000 },
  { iso_a3: 'BRA', continente: 'América del Sur', area_km2: 9000000 },
  { iso_a3: 'JPN', continente: 'Asia', area_km2: 1000000 },
]

describe('calcularStats', () => {
  it('con 0 viajes todo es 0, sin división por cero', () => {
    const s = calcularStats([], paises)
    expect(s.paisesVisitados).toBe(0)
    expect(s.porcentajePaises).toBe(0)
    expect(s.porcentajeSuperficie).toBe(0)
    expect(s.paisesTransitados).toBe(0)
    expect(calcularStats([], []).porcentajePaises).toBe(0)
  })

  it('calcula % de países y de superficie (1 de 4 = 25 %; 500.000 / 11.000.000 = 4,545…)', () => {
    const s = calcularStats([{ pais_iso: 'ESP', tipo: 'visita' }], paises)
    expect(s.paisesVisitados).toBe(1)
    expect(s.porcentajePaises).toBe(25)
    expect(s.areaVisitadaKm2).toBe(500000)
    expect(s.areaTotalKm2).toBe(11000000)
    expect(s.porcentajeSuperficie).toBeCloseTo(4.5454545, 5)
  })

  it('el mismo país visitado varias veces cuenta una sola vez', () => {
    const s = calcularStats(
      [
        { pais_iso: 'BRA', tipo: 'visita' },
        { pais_iso: 'BRA', tipo: 'visita' },
      ],
      paises
    )
    expect(s.paisesVisitados).toBe(1)
    expect(s.porcentajeSuperficie).toBeCloseTo((9000000 / 11000000) * 100, 8)
  })

  it('una escala no suma a países ni a superficie, solo a transitados', () => {
    const s = calcularStats([{ pais_iso: 'JPN', tipo: 'escala' }], paises)
    expect(s.paisesVisitados).toBe(0)
    expect(s.porcentajeSuperficie).toBe(0)
    expect(s.paisesTransitados).toBe(1)
  })

  it('país con visita y escala: prevalece la visita y no cuenta como transitado', () => {
    const s = calcularStats(
      [
        { pais_iso: 'FRA', tipo: 'escala' },
        { pais_iso: 'FRA', tipo: 'visita' },
      ],
      paises
    )
    expect(s.paisesVisitados).toBe(1)
    expect(s.paisesTransitados).toBe(0)
  })

  describe('subdivisiones', () => {
    const subdivisiones = [
      { codigo_iso_3166_2: 'ES-A', pais_iso: 'ESP', area_km2: 6000 },
      { codigo_iso_3166_2: 'ES-M', pais_iso: 'ESP', area_km2: 8000 },
      { codigo_iso_3166_2: 'ES-S', pais_iso: 'ESP', area_km2: 5000 },
    ]

    it('un viaje a una subdivisión cuenta el país en países, pero solo el área de la subdivisión', () => {
      const s = calcularStats([{ pais_iso: 'ESP', tipo: 'visita', subdivisiones: ['ES-S'] }], paises, subdivisiones)
      expect(s.paisesVisitados).toBe(1)
      expect(s.porcentajePaises).toBe(25)
      expect(s.areaVisitadaKm2).toBe(5000)
      expect(s.porcentajeSuperficie).toBeCloseTo((5000 / 11000000) * 100, 8)
    })

    it('varias subdivisiones en un viaje, o repartidas en varios, suman cada una una sola vez', () => {
      const s = calcularStats(
        [
          { pais_iso: 'ESP', tipo: 'visita', subdivisiones: ['ES-A', 'ES-M'] },
          { pais_iso: 'ESP', tipo: 'visita', subdivisiones: ['ES-M', 'ES-S'] },
        ],
        paises,
        subdivisiones
      )
      expect(s.areaVisitadaKm2).toBe(19000)
    })

    it('un viaje sin subdivisión al mismo país cuenta el país entero', () => {
      const s = calcularStats(
        [
          { pais_iso: 'ESP', tipo: 'visita', subdivisiones: ['ES-S'] },
          { pais_iso: 'ESP', tipo: 'visita', subdivisiones: null },
        ],
        paises,
        subdivisiones
      )
      expect(s.areaVisitadaKm2).toBe(500000)
    })

    it('una escala en una subdivisión no suma superficie', () => {
      const s = calcularStats([{ pais_iso: 'ESP', tipo: 'escala', subdivisiones: ['ES-S'] }], paises, subdivisiones)
      expect(s.areaVisitadaKm2).toBe(0)
      expect(s.paisesTransitados).toBe(1)
    })

    it('las subdivisiones nunca suman más que el área del país', () => {
      const grandes = [{ codigo_iso_3166_2: 'ES-A', pais_iso: 'ESP', area_km2: 900000 }]
      const s = calcularStats([{ pais_iso: 'ESP', tipo: 'visita', subdivisiones: ['ES-A'] }], paises, grandes)
      expect(s.areaVisitadaKm2).toBe(500000)
    })

    it('sin áreas de subdivisión conocidas, cuenta el país entero', () => {
      const s = calcularStats([{ pais_iso: 'ESP', tipo: 'visita', subdivisiones: ['ES-S'] }], paises)
      expect(s.areaVisitadaKm2).toBe(500000)
    })
  })

  it('ignora un viaje a un código que no está en la lista', () => {
    const s = calcularStats([{ pais_iso: 'XXX', tipo: 'visita' }], paises)
    expect(s.paisesVisitados).toBe(0)
  })

  it('desglosa por continente, ordenado, con totales aunque no haya visitas', () => {
    const s = calcularStats(
      [
        { pais_iso: 'ESP', tipo: 'visita' },
        { pais_iso: 'FRA', tipo: 'visita' },
        { pais_iso: 'JPN', tipo: 'visita' },
      ],
      paises
    )
    expect(s.porContinente).toEqual([
      { continente: 'América del Sur', visitados: 0, total: 1 },
      { continente: 'Asia', visitados: 1, total: 1 },
      { continente: 'Europa', visitados: 2, total: 2 },
    ])
  })

  it('visitar todos los países da exactamente 100 %', () => {
    const todos = paises.map((p) => ({ pais_iso: p.iso_a3, tipo: 'visita' }))
    const s = calcularStats(todos, paises)
    expect(s.porcentajePaises).toBe(100)
    expect(s.porcentajeSuperficie).toBe(100)
  })
})
