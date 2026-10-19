import { supabase } from './lib/supabase.js'
import { renderLogin } from './views/login.js'
import { renderGlobe } from './views/globe.js'
import { renderTripForm } from './views/tripForm.js'
import { renderCountryList } from './views/countryList.js'
import { renderCountryDetail } from './views/countryDetail.js'
import { renderTimeline } from './views/timeline.js'
import { renderNavBar } from './components/navBar.js'

const app = document.getElementById('app')

const NAV_ITEMS = [
  { id: 'globo', label: 'Globo' },
  { id: 'lista', label: 'Lista' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'viajes', label: 'Viajes' },
]

let currentView = 'globo'
let selectedCountry = null // iso_a3 de la ficha abierta desde la lista

function renderView() {
  app.innerHTML = `<div id="nav"></div><div id="content"></div><button id="logout">Cerrar sesión</button>`
  app.querySelector('#logout').addEventListener('click', () => supabase.auth.signOut())

  renderNavBar(app.querySelector('#nav'), {
    items: NAV_ITEMS,
    active: currentView === 'pais' ? 'lista' : currentView,
    onNavigate: (id) => {
      currentView = id
      renderView()
    },
  })

  const content = app.querySelector('#content')
  if (currentView === 'viajes') renderTripForm(content)
  else if (currentView === 'timeline') renderTimeline(content)
  else if (currentView === 'pais') {
    renderCountryDetail(content, selectedCountry, {
      onBack: () => {
        currentView = 'lista'
        renderView()
      },
    })
  } else if (currentView === 'lista') {
    renderCountryList(content, {
      onSelect: (iso) => {
        selectedCountry = iso
        currentView = 'pais'
        renderView()
      },
    })
  }
  else renderGlobe(content)
}

// Guard: sin sesión solo se ve el login. onAuthStateChange dispara también al cargar (INITIAL_SESSION).
supabase.auth.onAuthStateChange((_event, session) => {
  if (session) renderView()
  else renderLogin(app)
})
