import { supabase } from './lib/supabase.js'
import { renderLogin } from './views/login.js'
import { renderGlobe } from './views/globe.js'
import { renderTripForm } from './views/tripForm.js'
import { renderNavBar } from './components/navBar.js'

const app = document.getElementById('app')

const NAV_ITEMS = [
  { id: 'globo', label: 'Globo' },
  { id: 'viajes', label: 'Viajes' },
]

let currentView = 'globo'

function renderView() {
  app.innerHTML = `<div id="nav"></div><div id="content"></div><button id="logout">Cerrar sesión</button>`
  app.querySelector('#logout').addEventListener('click', () => supabase.auth.signOut())

  renderNavBar(app.querySelector('#nav'), {
    items: NAV_ITEMS,
    active: currentView,
    onNavigate: (id) => {
      currentView = id
      renderView()
    },
  })

  const content = app.querySelector('#content')
  if (currentView === 'viajes') renderTripForm(content)
  else renderGlobe(content)
}

// Guard: sin sesión solo se ve el login. onAuthStateChange dispara también al cargar (INITIAL_SESSION).
supabase.auth.onAuthStateChange((_event, session) => {
  if (session) renderView()
  else renderLogin(app)
})
