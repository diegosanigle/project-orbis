import { supabase } from '../lib/supabase.js'

export function renderLogin(container) {
  container.innerHTML = `
    <main>
      <h1>Orbis</h1>
      <form id="login-form">
        <label>Email <input name="email" type="email" autocomplete="username" required></label>
        <label>Contraseña <input name="password" type="password" autocomplete="current-password" required></label>
        <button type="submit">Entrar</button>
        <p id="login-error" role="alert"></p>
      </form>
    </main>`

  const form = container.querySelector('#login-form')
  const error = container.querySelector('#login-error')
  const button = form.querySelector('button')

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    error.textContent = ''
    button.disabled = true
    const { email, password } = Object.fromEntries(new FormData(form))
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    button.disabled = false
    if (authError) error.textContent = 'Email o contraseña incorrectos.'
  })
}
