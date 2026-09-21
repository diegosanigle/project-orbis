import Globe from 'globe.gl'

const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

export async function renderGlobe(container) {
  container.innerHTML = `<div id="globe"></div><p id="globe-label" aria-live="polite">Toca un país</p>`
  const el = container.querySelector('#globe')
  const label = container.querySelector('#globe-label')

  const [paises, geo] = await Promise.all([
    fetch('/data/paises.json').then((r) => r.json()),
    fetch('/data/paises.geojson').then((r) => r.json()),
  ])
  const nombres = new Map(paises.map((p) => [p.iso_a3, p.nombre_es]))

  const globe = Globe()(el)
    .width(window.innerWidth)
    .height(window.innerHeight)
    .backgroundColor(css('--sky'))
    .showAtmosphere(false)
    .polygonsData(geo.features)
    .polygonCapColor(() => css('--globe-land'))
    .polygonSideColor(() => 'rgba(0,0,0,0)')
    .polygonStrokeColor(() => css('--ink'))
    .polygonAltitude(0.005)
    .onPolygonClick((f) => {
      label.textContent = nombres.get(f.properties.iso_a3) ?? f.properties.iso_a3
    })

  const controls = globe.controls()
  controls.minDistance = 130
  controls.maxDistance = 400
  controls.enableDamping = true

  window.addEventListener('resize', () => globe.width(window.innerWidth).height(window.innerHeight))
}
