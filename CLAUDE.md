# CLAUDE.md

## Proyecto

**Orbis.** App web **privada, de un solo usuario**, para registrar viajes y
visualizarlos sobre un globo terráqueo 3D, con métricas de porcentaje de mundo visitado.

No es un producto y no tendrá más usuarios. Optimiza **simplicidad y mantenibilidad**,
nunca escalabilidad ni extensibilidad especulativa.

## Plan y diseño

Las fases de construcción y todas las decisiones de producto están en **`PLAN.md`**.
El sistema visual (paleta, tipografía, componentes, accesibilidad) está en
**`orbis-design-system.md`**.

Léelos antes de empezar una fase nueva. No los repitas aquí ni los resumas en el código.
Los colores y tamaños salen siempre de los tokens del design system: **no inventes valores
hex ni espaciados a ojo.**

## Stack — decidido, no reabrir

- **Vite + JavaScript vanilla** (sin framework)
- **globe.gl** (sobre Three.js) para el globo 3D
- **Supabase** (Postgres + Auth) como backend
- **Cloudflare Pages** para el hosting
- `marked` + `DOMPurify` para las notas en Markdown

No propongas React, Next.js, TypeScript, Tailwind, Leaflet, Mapbox ni otro backend.
Son decisiones cerradas con motivo, no preguntas abiertas. Si crees que una de ellas
bloquea algo concreto, dilo y espera respuesta; no la cambies por tu cuenta.

## Reglas que no se rompen

- El estado "visitado" **nunca se almacena**: se deriva siempre de la tabla `viajes`.
  Un booleano `visitado` en paralelo se desincroniza.
- Todo el dataset geográfico de `/public/data` es **estático y de solo lectura desde la
  app**. La app nunca escribe ahí ni lo sube a Supabase. Los scripts de `/scripts` sí
  generan esos ficheros, pero se ejecutan aparte, a mano, no como parte del build ni del
  runtime.
- **RLS activada** en cualquier tabla nueva, con policy `auth.uid() = user_id`.
- La `anon key` de Supabase puede ir en el cliente (la protección es la RLS). La
  `service_role key` no aparece nunca en el repo ni en el frontend.
- La lógica de cálculo va en **funciones puras** en `/src/lib`, aisladas de la UI.
- Las notas en Markdown se sanitizan con DOMPurify **antes** de tocar el DOM.
- **El estado de un país nunca se codifica solo por color.** La escala se distingue por
  trama, todo país es accesible por tap con su estado en texto, y la vista de lista es
  obligatoria, no opcional.

## Fuera de alcance

No implementes, aunque parezcan fáciles o "naturales":

fotos · wishlist · multiusuario · compartir públicamente · import de Google Timeline ·
recomendaciones con IA · subdivisiones de países fuera de ES/PT/FR/IT/US

Si detectas que algo de esto haría falta, **propónlo y espera**. No lo construyas.

## Cómo trabajamos

- Un **commit por paso funcional**, con mensaje descriptivo.
- Usa **plan mode** antes de cualquier cambio que toque varios ficheros.
- **No añadas funcionalidad que no se ha pedido.**
- Ante una ambigüedad del plan, **pregunta en vez de asumir**.
- Señala explícitamente cualquier decisión técnica relevante que tomes sobre la marcha.
- Mantén la solución lo más simple que funcione. Este proyecto no necesita abstracciones.

## Verificación

- **Rendimiento del globo: se prueba en un iPhone real**, no en el simulador ni solo en
  escritorio.
- **La RLS se verifica a mano** (leer con la anon key sin sesión y comprobar que devuelve
  vacío). No se da por hecha porque el panel diga que está activada.
- Los cálculos de porcentaje se contrastan con un cálculo manual antes de darlos por
  buenos.
