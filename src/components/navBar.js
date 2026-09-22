// Navegación inferior (orbis-design-system.md §6.10)
// Genérica por ítems; hoy se monta solo con 2 (globo/viajes) — ver PLAN.md Fase 5.3.
export function renderNavBar(container, { items, active, onNavigate }) {
  container.innerHTML = `
    <nav id="nav-bar">
      ${items
        .map(
          (item) =>
            `<button type="button" data-id="${item.id}" ${item.id === active ? 'aria-current="page"' : ''}>${item.label}</button>`
        )
        .join('')}
    </nav>`

  container.querySelectorAll('button[data-id]').forEach((button) => {
    button.addEventListener('click', () => onNavigate(button.dataset.id))
  })
}
