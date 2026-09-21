import { supabase } from './lib/supabase.js'
import { renderLogin } from './views/login.js'

const app = document.getElementById('app')

function renderHome() {
  app.innerHTML = `<main><h1>Orbis</h1><button id="logout">Cerrar sesión</button></main>`
  app.querySelector('#logout').addEventListener('click', () => supabase.auth.signOut())
}

// Guard: sin sesión solo se ve el login. onAuthStateChange dispara también al cargar (INITIAL_SESSION).
supabase.auth.onAuthStateChange((_event, session) => {
  if (session) renderHome()
  else renderLogin(app)
})
