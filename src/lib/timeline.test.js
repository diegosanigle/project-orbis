import { describe, expect, it } from 'vitest'
import { aniosConViajes, viajesDelTimeline } from './timeline.js'

const viajes = [
  { id: 1, fecha_inicio: '2023-05-10' },
  { id: 2, fecha_inicio: '2025-01-02' },
  { id: 3, fecha_inicio: '2023-11-30' },
]

describe('timeline', () => {
  it('lista los años sin repetir, del más reciente al más antiguo', () => {
    expect(aniosConViajes(viajes)).toEqual([2025, 2023])
  })
  it('ordena de más reciente a más antiguo', () => {
    expect(viajesDelTimeline(viajes).map((v) => v.id)).toEqual([2, 3, 1])
  })
  it('filtra por año', () => {
    expect(viajesDelTimeline(viajes, 2023).map((v) => v.id)).toEqual([3, 1])
  })
  it('sin viajes devuelve vacío', () => {
    expect(aniosConViajes([])).toEqual([])
    expect(viajesDelTimeline([], 2024)).toEqual([])
  })
})
