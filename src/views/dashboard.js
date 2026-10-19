// Dashboard de estadísticas: totales, continentes, país más repetido, viajes por año
import { supabase } from '../lib/supabase.js'
import { banderaEmoji } from '../lib/geo.js'
import { calcularStats, paisesMasRepetidos, viajesPorAnio } from '../lib/stats.js'

const pct = (n) => `${n.toFixed(1).replace('.', ',')} %`

export async function renderDashboard(container) {
  container.innerHTML = `
    <main id="dashboard">
      <h1>Estadísticas</h1>
      <p id="dashboard-error" role="alert"></p>
      <div id="dashboard-body">Cargando…</div>
    </main>`
  const body = container.querySelector('#dashboard-body')

  const [paises, { data, error }] = await Promise.all([
    fetch('/data/paises.json').then((r) => r.json()),
    supabase.from('viajes').select('pais_iso, tipo, subdivisiones, fecha_inicio'),
  ])
  if (error) {
    container.querySelector('#dashboard-error').textContent = 'No se pudieron cargar los viajes.'
    body.textContent = ''
    return
  }
  const viajes = data ?? []
  const stats = calcularStats(viajes, paises)
  const top = paisesMasRepetidos(viajes)[0]
  const topPais = top && paises.find((p) => p.iso_a3 === top.pais_iso)
  const porAnio = viajesPorAnio(viajes)

  body.innerHTML = `
    <section aria-label="Resumen">
      <p><strong>${stats.paisesVisitados}</strong> de ${stats.paisesTotal} países (${pct(stats.porcentajePaises)})</p>
      <p><strong>${pct(stats.porcentajeSuperficie)}</strong> de la superficie del mundo</p>
      <p><strong>${stats.paisesTransitados}</strong> países en tránsito (escalas)</p>
    </section>
    <section aria-label="Por continente">
      <h2>Continentes</h2>
      <ul>${stats.porContinente
        .map((c) => `<li>${c.continente}: ${c.visitados} de ${c.total}</li>`)
        .join('')}</ul>
    </section>
    <section aria-label="País más repetido">
      <h2>País más repetido</h2>
      <p>${
        topPais
          ? `${banderaEmoji(topPais.iso_a2)} ${topPais.nombre_es}, ${top.viajes} viaje${top.viajes === 1 ? '' : 's'}`
          : 'Aún no hay viajes.'
      }</p>
    </section>
    <section aria-label="Viajes por año">
      <h2>Viajes por año</h2>
      ${
        porAnio.length
          ? `<ul>${porAnio.map((a) => `<li>${a.anio}: ${a.viajes}</li>`).join('')}</ul>`
          : '<p>Aún no hay viajes.</p>'
      }
    </section>`
}
