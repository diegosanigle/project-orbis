import { describe, expect, it } from 'vitest'
import { calcularStats, paisesMasRepetidos, viajesPorAnio } from './stats.js'

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

  it('un viaje a una subdivisión cuenta el país entero', () => {
    const s = calcularStats([{ pais_iso: 'ESP', tipo: 'visita', subdivisiones: ['ES-S'] }], paises)
    expect(s.paisesVisitados).toBe(1)
    expect(s.areaVisitadaKm2).toBe(500000)
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

describe('paisesMasRepetidos / viajesPorAnio', () => {
  const viajes = [
    { pais_iso: 'ESP', tipo: 'visita', fecha_inicio: '2023-05-01' },
    { pais_iso: 'ESP', tipo: 'visita', fecha_inicio: '2024-06-01' },
    { pais_iso: 'FRA', tipo: 'visita', fecha_inicio: '2024-07-01' },
    { pais_iso: 'FRA', tipo: 'escala', fecha_inicio: '2024-08-01' },
    { pais_iso: 'ITA', tipo: 'escala', fecha_inicio: '2022-01-01' },
  ]
  it('ordena países por visitas e ignora las escalas', () => {
    expect(paisesMasRepetidos(viajes)).toEqual([
      { pais_iso: 'ESP', viajes: 2 },
      { pais_iso: 'FRA', viajes: 1 },
    ])
  })
  it('desempata por código ISO', () => {
    expect(
      paisesMasRepetidos([
        { pais_iso: 'FRA', tipo: 'visita' },
        { pais_iso: 'ESP', tipo: 'visita' },
      ]).map((p) => p.pais_iso)
    ).toEqual(['ESP', 'FRA'])
  })
  it('cuenta visitas por año, del más reciente al más antiguo', () => {
    expect(viajesPorAnio(viajes)).toEqual([
      { anio: 2024, viajes: 2 },
      { anio: 2023, viajes: 1 },
    ])
  })
  it('sin viajes devuelve vacío', () => {
    expect(paisesMasRepetidos([])).toEqual([])
    expect(viajesPorAnio([])).toEqual([])
  })
})
