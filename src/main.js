import { supabase } from './lib/supabase.js'
import { renderLogin } from './views/login.js'
import { renderGlobe } from './views/globe.js'

const app = document.getElementById('app')

async function renderHome() {
  await renderGlobe(app)
  app.insertAdjacentHTML('beforeend', `<button id="logout">Cerrar sesión</button>`)
  app.querySelector('#logout').addEventListener('click', () => supabase.auth.signOut())
}

// Guard: sin sesión solo se ve el login. onAuthStateChange dispara también al cargar (INITIAL_SESSION).
supabase.auth.onAuthStateChange((_event, session) => {
  if (session) renderHome()
  else renderLogin(app)
})
