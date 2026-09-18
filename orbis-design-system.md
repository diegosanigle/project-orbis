# Orbis — Design System

Guía visual de **Orbis**, app personal de registro de viajes sobre un globo terráqueo 3D.

Registro de lo recorrido: sin gamificación agresiva, sin rankings, sin presión por completar. El sistema celebra el mapa que se va llenando, no el que falta.

Versión derivada de las cuatro pantallas de maqueta (splash, globo, lista de países, ficha de país). Todos los valores de color están **muestreados del archivo original**, no estimados a ojo, y todos los ratios de contraste están **calculados**, no supuestos.

---

## 0. Lo que la maqueta fija y lo que hay que corregir

La maqueta define el carácter de la app y se respeta: cielo azul de fondo para el globo, crema para las pantallas de contenido, serif italiano para los títulos, versalitas espaciadas para las etiquetas, naranja para lo visitado.

Tres cosas de la maqueta **no funcionan medidas** y el sistema las corrige:

| Problema | Medido | Corrección |
|---|---|---|
| Naranja visitado `#EA9551` contra verde no visitado `#B7C6A8` | **1.31:1** | Naranja más profundo + tierra en gris neutro → **3.23:1** en el mapa 2D (§2.3) |
| Gris de texto secundario `#6B7163` sobre crema | **4.29:1** (falla AA) | `#5C6254` → **5.36:1** (§2.2) |
| Lema en versalitas blancas sobre el cielo | **3.24:1** (falla a ese tamaño) | Banda de cielo profundo detrás, o tamaño ≥24px (§2.4) |

> **Por qué el primero importa tanto.** Naranja contra verde salvia se lee en la maqueta por diferencia de **tono**, no de luminancia. Eso significa que para la deficiencia rojo-verde —la más frecuente— el mapa entero se vuelve una superficie uniforme. Es el dato principal de la app; no puede depender del par cromático más frágil que existe.

**Inconsistencia a arreglar en el producto, no en el diseño:** la maqueta dice "32 DE 195". El denominador acordado en `PLAN.md` es **249** (todo ISO 3166-1, sin distinguir miembros de la ONU de territorios).

---

## 1. Principios

- **El globo es el producto.** Todo lo demás es soporte.
- **Dos mundos visuales, uno por función.** El **azul** es el mundo (splash, globo, cabeceras): inmersivo, a sangre, sin cromo. El **crema** es el cuaderno (listas, fichas, formularios): plano, legible, denso en datos. Una pantalla es de uno o de otro, nunca mezcla los dos como fondo.
- **El dato se codifica por color *y* por forma.** Ningún estado del mapa depende solo del color (§2.3, §9).
- **Serif para la voz, sans para el trabajo.** El serif titula; el sans hace el trabajo.
- **Versalitas espaciadas como firma.** Es el recurso de etiqueta del sistema — deliberado aquí, aunque sea un recurso gastado en general. Solo en etiquetas de una a cuatro palabras, nunca en frases.
- **Regla del 4/8** en todo espaciado, tamaño y radio.
- **Cifras tabulares siempre.**
- **Accesibilidad AA** como base (§9).

---

## 2. Color

### 2.1 Acento

| Token | Hex | Uso |
|---|---|---|
| `--orange` | **`#DA5F2E`** | País visitado en mapa y globo. Acento de marca. |
| `--orange-light` | `#EA9551` | **Decorativo únicamente**: degradados, brillo de hover, ilustración. Nunca como relleno que codifique un estado — contra cualquier tierra queda por debajo de 2.1:1. |
| `--orange-ink` | `#A8471F` | **Texto** en naranja sobre crema. 4.98:1. |
| `--orange-soft` | `#F7E3D4` | Fondos de chip, hover suave. |

> `--orange` sobre crema da **3.16:1**: válido como objeto gráfico y para texto grande, **no para texto pequeño**. Para cualquier texto naranja de tamaño de cuerpo, `--orange-ink`.

### 2.2 Neutros cálidos

| Token | Hex | Uso | Contraste |
|---|---|---|---|
| `--ink` | `#12150F` | Texto principal. | 15.67:1 sobre crema |
| `--ink-2` | `#3D4438` | Texto secundario con énfasis. | 8.58:1 |
| `--ink-3` | `#5C6254` | **Gris único** de texto secundario. Corregido respecto a la maqueta. | 5.36:1 |
| `--bg` | `#F2ECE1` | Fondo de las pantallas de contenido. | — |
| `--surface` | `#FAF7F1` | Cards y hojas sobre `--bg`. | — |
| `--border` | `#E2DACB` | Separadores de fila y bordes. | — |

**Regla del gris único:** `#5C6254` es el único gris de texto secundario. No inventar intermedios.

> Nota de contexto: crema + naranja es una combinación muy transitada ahora mismo. Lo que mantiene a Orbis reconocible no es la paleta de las pantallas de lista, sino el **contraste entre los dos mundos** — el salto del azul inmersivo al crema plano. Si el azul se diluye, queda una app genérica.

### 2.3 Paleta del mapa 2D — **el componente crítico**

| Token | Hex | Significado |
|---|---|---|
| `--map-land` | `#EFEFEF` | Tierra **no visitada**. Gris neutro, sin sesgo cálido — mismo valor que usaste en Robur para "sin sesiones" (`#EAEAEA`), por el mismo motivo: un gris que no compite con el naranja. |
| `--map-visited` | `#DA5F2E` | País visitado. |
| `--map-transit` | `--map-land` + **trama diagonal** de `--orange` | País solo transitado (escala). |
| `--map-stroke` | `#F2ECE1` | Contorno de países, 0.5–1px. |
| `--map-sea` | `#F2ECE1` | Mar: el propio fondo de la pantalla, sin relleno propio. |

> El gris se aplica **solo al mapa 2D** (§6.2, §6.3), no al globo 3D, que mantiene tierra verde pálida (§2.4) por coherencia con su ilustración de fondo. Es una decisión deliberada de tener dos codificaciones de "no visitado" — gris en el cuaderno, verde en el mundo — y no una inconsistencia: cada vista ya distingue "no visitado" del resto de su propio contexto visual, así que no hace falta que ambas usen el mismo tono.

**Ratios verificados:**

| Par | Ratio | Veredicto |
|---|---|---|
| visitado vs no visitado (gris) | **3.23:1** | ✅ objeto gráfico (≥3:1) — el par que codifica el dato |
| no visitado (gris) vs fondo crema | 1.02:1 | Resuelto por contorno y gap, no por relleno — mismo caso que el nivel 0 de Robur contra su fondo |
| visitado vs fondo crema | 3.16:1 | ✅ |

> **Por qué gris claro y no un gris medio.** Un gris intermedio (`#B4B4B4`-`#CFCFCF`, lo intuitivo al pedir "gris") queda entre 1.8:1 y 2.4:1 contra el naranja: el naranja está a media luminancia y un gris a esa misma altura no se separa por ningún lado. Solo funciona un gris claro (por encima de `≈#E6E6E6`) o muy oscuro; el claro es el que encaja con el resto de la paleta cálida.
>
> **El margen es justo (3.23:1, no muy por encima del mínimo).** Si en pruebas reales el naranja no salta lo suficiente sobre el gris, la vía correcta es oscurecer el naranja hacia `#C85126` (sube a 3.62:1 contra este gris), no aclarar más el gris: ya está pegado al blanco.

**La escala se distingue por trama, no por color.** Relleno `--map-land` con diagonales de `--orange` a 45°, 2px de ancho y 6px de paso. Un color plano intermedio se leería como "medio visitado"; la trama se lee como "aquí no me bajé del avión". Además, es el único recurso que sobrevive a cualquier deficiencia de color.

**País seleccionado:** contorno `--ink` 1.5px, sin cambiar el relleno.

**Subdivisiones (ES/PT/FR/IT/US):** mismos tres estados, contorno interno más fino y de menor opacidad, para que la frontera nacional siga dominando sobre la provincial.

### 2.4 Paleta del globo y del cielo

| Token | Hex | Uso |
|---|---|---|
| `--sky` | `#5D96B4` | Atmósfera: fondo detrás de la esfera y de las cabeceras a sangre. |
| `--sky-deep` | `#3F7695` | Banda inferior del degradado y fondo tras texto pequeño en blanco (4.96:1). |
| `--globe-land` | `#E3EADB` | Tierra no visitada **del globo 3D únicamente**. Verde salvia pálido, distinto del gris del mapa 2D (§2.3) — ver nota de esa sección sobre por qué conviven dos tonos. |
| `--cypress` | `#2C4934` | Verde ciprés de la ilustración. Segunda serie en gráficas. |
| `--gold` | `#D7A65C` | Acento de la ilustración. Decorativo, nunca dato. |

> **Ratio del globo, para referencia:** visitado (`--map-visited`, `#DA5F2E`) vs `--globe-land` (`#E3EADB`) da **2.81:1** — por debajo del mínimo del mapa 2D. Es aceptable aquí porque el globo **no es la vista que garantiza accesibilidad** (§9): esa función la cumple la lista de países del mapa 2D, con contorno de país como refuerzo adicional en el globo. Si se prefiere que el globo cumpla el mismo 3:1 por sí solo, aclarar `--globe-land` hacia `#EBF0E5` (3.02:1).

**Texto sobre el cielo:** blanco sobre `--sky` da **3.24:1** — suficiente para display y títulos grandes, **insuficiente para versalitas pequeñas**. El lema del splash y cualquier etiqueta blanca pequeña van sobre `--sky-deep` (4.96:1) o sobre un degradado que oscurezca esa zona. `--ink` sobre `--sky` da 5.69:1 y es siempre seguro.

**Relleno de tierra en el globo 3D: plano, no fotográfico.** La maqueta muestra un globo con textura pictórica de relieve. Reproducirlo tiene dos costes: obliga a una textura equirectangular a medida (las públicas disponibles, tipo Blue Marble, son fotográficas y no pictóricas), y sobre todo **rompe el encoding** — un naranja de visitado sobre una textura de tonos variables no tiene contraste garantizado en ningún punto. La tierra del globo usa `--globe-land` plano, con un sombreado de relieve opcional por encima **al 8–10% de opacidad como máximo**, suficiente para insinuar volumen sin alterar los ratios.

### 2.5 Estados de sistema

Feedback funcional únicamente. **Nunca para el estado de un país.**

| Rol | Fondo | Texto |
|---|---|---|
| Éxito | `#E9F0E4` | `#2E5B3C` |
| Error | `#FAE9E4` | `#A83224` |
| Info | `#EDEAE2` | `#3D4438` |

---

## 3. Tipografía

**Display / marca:** serif de alto contraste con itálica. Propuesta: **`Bodoni Moda`** (Google Fonts). Alternativas: `Instrument Serif` (más seco), `Playfair Display` (el más usado, y por eso el más reconocible como plantilla).

**Interfaz y datos:** **`Inter`** variable, por sus cifras tabulares fiables. Si se prefiere otra familia por carácter, **verificar antes que incluye `tabular-nums`**.

Todo dato numérico con `font-variant-numeric: tabular-nums` (clase `.num`). Innegociable.

| Rol | Token | Familia | Tamaño | Peso | Interlineado | Tracking |
|---|---|---|---|---|---|---|
| Wordmark | `.t-mark` | Bodoni Moda *italic* | — | 500 | 1 | 0 |
| Display (cifra protagonista) | `.t-display` | Bodoni Moda | 3.5rem | 400 | 1 | 0 |
| Título de pantalla | `.t-h1` | Bodoni Moda *italic* | 1.75rem | 500 | 1.15 | 0 |
| Nombre de país (ficha) | `.t-country` | Bodoni Moda *italic* | 2.25rem | 500 | 1.1 | 0 |
| H2 | `.t-h2` | Inter | 1.25rem | 600 | 1.25 | -0.01em |
| Fila de lista | `.t-row` | Inter | 1rem | 500 | 1.4 | 0 |
| Cuerpo | `.t-body` | Inter | 1rem | 400 | 1.5 | 0 |
| Small | `.t-sm` | Inter | 0.875rem | 400 | 1.4 | 0 |
| Etiqueta | `.t-label` | Inter | 0.6875rem | 600 | 1.3 | **0.12em**, mayúsculas |

**Dónde aparece el serif, y solo ahí:** wordmark, cifra protagonista, título de pantalla y nombre de país. En ningún otro sitio. Si aparece en un label de formulario o en una fila de lista, está mal aplicado.

**Versalitas espaciadas (`.t-label`).** Es la firma del sistema: `DEL PLANETA EXPLORADO`, `EUROPA`, `CIUDADES`, `VISITADA EN 2023`. Tracking generoso (0.12em) y tamaño pequeño. Límite duro: **máximo cuatro palabras**. Una frase en versalitas espaciadas es ilegible, y el recurso pierde su función de etiqueta en cuanto se usa para contenido.

**Reglas de cifra:**
- Cifra en `.t-display`, símbolo `%` a tamaño reducido, descriptor debajo en `.t-label`.
- Las dos métricas (% países y % superficie) comparten peso visual. Ninguna es subordinada: miden cosas distintas.
- Separador decimal con **coma** (`1,6%`), como en la maqueta.

---

## 4. Espaciado

- Padding lateral de pantalla: **20px**.
- Alto de fila de lista: **56px**, con separador `--border` de 1px a sangre parcial (no llega al borde izquierdo, empieza tras el icono).
- Gap entre bloques: **32px**.
- Padding interno de card: **20px**. Card destacada: **24px**.
- Label → dato: **4px** (la etiqueta en versalitas va pegada a su cifra; es lo que las lee como una unidad).
- Ante la duda, múltiplo de 8; en ajustes finos, de 4.

**Pantallas azules a sangre:** sin padding superior. El contenido arranca bajo la barra de estado y la ilustración llega a los cuatro bordes.

---

## 5. Radios y elevación

**Radios:** `--r-sm` 12 · `--r-md` 16 · `--r-lg` 24 · `--r-xl` 28 (card de ficha de país sobre imagen). Pills y botones: 999px.

**Sombras:** el sistema es plano sobre crema, con una excepción: las cards que se superponen a una imagen o al globo necesitan elevación real.

- `--shadow-sm`: `0 1px 2px rgba(18,21,15,.06)` — inputs.
- `--shadow-md`: `0 4px 16px rgba(18,21,15,.10)` — hojas modales.
- `--shadow-lg`: `0 -8px 32px rgba(18,21,15,.16)` — card de ficha de país sobre la cabecera, y paneles sobre el globo.
- Filas de lista: **sin sombra ni card**. Separador de 1px y nada más. Es lo que mantiene la lista ligera.

---

## 6. Componentes

### 6.1 Globo (`Globe`) — componente firma

- Esfera sobre `--sky`, con degradado sutil hacia `--sky-deep` en la parte inferior.
- **Sin fondo espacial negro.** Es la decisión que separa este globo de cualquier otro globo 3D.
- Rellenos según §2.3 y §2.4: tierra plana, relieve opcional al 8–10%.
- Halo de atmósfera en el borde, blanco al 15%, 4–6px. Único adorno permitido.
- Cifra de % en `.t-display` bajo la esfera, con `.t-label` debajo.
- Pill de acceso a la lista al pie: fondo `--surface` al 90% con blur, icono + texto + chevron.
- Rotación con inercia; zoom limitado para no atravesar la superficie.

> **Nota de rendimiento.** Si en móvil la rotación no es fluida, recortar en este orden: halo → degradado de fondo → relieve → detalle de geometría. **Nunca el contorno de países**: es lo que sostiene la legibilidad del dato.

### 6.2 Mapa plano (`WorldMapFlat`)

Proyección plana sobre `--bg`, sin relleno de mar, que encabeza la lista de países. Mismos tres estados que el globo. No es decoración: es el resumen visual que da sentido a la lista que va debajo.

### 6.3 Lista de países

Cabecera: título en `.t-h1` itálica, subtítulo en `.t-label` con el recuento (`32 DE 249`).

Fila: bandera · nombre en `.t-row` · % en `.t-sm`/`--ink-3` alineado a la derecha · chevron.

**Sobre las banderas.** Se adoptan, revirtiendo la decisión anterior de no usarlas: dan reconocimiento inmediato y ahorran leer 249 nombres. La implementación es **emoji Unicode**, no imágenes — cero assets que mantener y renderizado nativo en iOS. Dos límites reales: algunas entradas de ISO 3166 no tienen emoji de bandera, y no todos los sistemas los dibujan. Por eso la bandera **acompaña** al nombre, nunca lo sustituye, y la fila funciona igual si la bandera no aparece.

Esta pantalla es también la **vista accesible equivalente al globo** (§9): completa, filtrable y navegable por teclado.

### 6.4 Ficha de país

- Cabecera visual a sangre (§11, decisión abierta sobre su contenido).
- Card `--surface`, radio `--r-xl`, `--shadow-lg`, montada sobre la cabecera con un solape de ~24px.
- Bandera · nombre en `.t-country` itálica · continente en `.t-label`.
- Dos cifras en fila, separadas por un filete vertical de 1px `--border`: `.t-display` reducido + `.t-label`.
- Lista de lugares con puntos huecos y filete vertical de conexión: nombre en `.t-row`, año en `.t-label`.
- Card de sugerencia al pie, fondo teñido claro, texto en serif itálico.

> **Nota de modelo de datos.** La maqueta lista ciudades ("Roma, Florencia, Milán") con un año cada una. En `PLAN.md` el campo es `lugar`, texto libre por viaje. La ficha agrupa por `lugar` y muestra el año de la fecha del viaje; no hay entidad "ciudad" y no debe crearse una para cuadrar con la maqueta.

### 6.5 Botones

**Primario:** pill, fondo `--orange`, texto blanco. Blanco sobre `#DA5F2E` da **3.71:1** — válido solo con texto ≥16px y peso ≥600. No reducir por debajo de eso; si hiciera falta un botón más pequeño, invertir a texto `--orange-ink` sobre `--orange-soft`.

**Sobre imagen o globo:** fondo `--surface` al 90% con blur, texto `--ink`. Nunca naranja translúcido sobre el globo: se confundiría con un país visitado.

**Secundario:** borde `--ink` 1px, fondo transparente.

**Hit target mínimo: 44px.**

### 6.6 Chips y selectores

Pill pequeña, `.t-sm`, peso 600. Normal: `--surface`, texto `--ink-3`, borde `--border`. Seleccionado: `--ink` con texto blanco. Acento: `--orange-soft` con `--orange-ink`.

El chip de tipo de viaje (visita / escala) **muestra la misma trama diagonal que el mapa**. La coherencia entre el control y el mapa es lo que enseña el código visual sin necesidad de leyenda.

### 6.7 Inputs

Fondo `--surface`, borde `--border` 1px, radio `--r-md`, padding 14px. Foco: borde `--orange` + halo `0 0 0 3px` al 20%.

**Selector de país:** búsqueda incremental. Con ~249 entradas un desplegable plano no es usable.

### 6.8 Editor de notas

Textarea en `.t-body` con preview. El Markdown del usuario mapea a la escala del sistema, no a los tamaños por defecto del navegador. Sin toolbar: se escribe Markdown.

### 6.9 Hoja modal

Anclada abajo, radio superior 28px, grip 36×4px. Fondo `--surface`. Backdrop `rgba(18,21,15,.45)`.

### 6.10 Navegación inferior

**Tres ítems** (globo · mapa/lista · perfil), como en la maqueta. Fondo `--bg` sin línea divisoria. Activo `--ink` con indicador de 2px debajo; inactivo `--ink-3`. `scale(.92)` al presionar.

---

## 7. Iconografía

- Set único, trazo **1.5px**, 24px de caja. Recomendación: **Lucide**.
- Color `--ink` activo, `--ink-3` reposo. El naranja se reserva a dato, **no a iconos decorativos**.
- La estrella de cuatro puntas del splash es un elemento de marca, no un icono de sistema: aparece en el splash y en la cabecera del globo, en ningún otro sitio.
- Las banderas son contenido, no iconografía: no siguen estas reglas (§6.3).

---

## 8. Movimiento

- **Un solo momento orquestado: la entrada del globo.** Fade y rotación lenta hasta la posición inicial, 0.8s. Es el único movimiento no disparado por el usuario.
- **Al registrar un viaje:** el globo rota hasta centrar el país y el relleno transiciona en 0.5s. Es el feedback que sostiene el hábito. Nada por encima de esto — ni confeti, ni sonido, ni contador animado.
- Paneles y hojas: 0.3s `cubic-bezier(.22,.61,.36,1)`.
- Micro-interacciones: chips `scale(.95)`, nav `scale(.92)`.
- **Nada de fade-up escalonado por sección ni transición de hover en cada fila.**
- `focus-visible`: outline `--orange` 2px, offset 2px.
- **`prefers-reduced-motion`:** todo desactivado, incluida la rotación de entrada, que pasa a posición final directa.

---

## 9. Accesibilidad (AA)

| Combinación | Ratio | Veredicto |
|---|---|---|
| `--ink` sobre `--bg` | 15.67:1 | ✅ |
| `--ink-2` sobre `--bg` | 8.58:1 | ✅ |
| `--ink-3` sobre `--bg` | 5.36:1 | ✅ texto normal |
| `--orange-ink` sobre `--bg` | 4.98:1 | ✅ texto normal |
| `--orange` sobre `--bg` | 3.16:1 | Solo texto grande y objetos gráficos |
| blanco sobre `--orange` | 3.71:1 | Solo texto ≥16px/600 |
| visitado vs no visitado (mapa 2D, gris) | 3.23:1 | ✅ objeto gráfico, sin holgura |
| visitado vs no visitado (globo, verde) | 2.81:1 | ⚠️ por debajo de 3:1 — ver nota §2.4 |
| `--ink` sobre `--sky` | 5.69:1 | ✅ |
| blanco sobre `--sky` | 3.24:1 | Solo texto grande |
| blanco sobre `--sky-deep` | 4.96:1 | ✅ texto normal |
| `--cypress` sobre `--bg` | 8.47:1 | ✅ |

Además:

- **El estado de un país no puede depender solo del color.** Tres medidas obligatorias: la escala se distingue por **trama**; todo país es accesible por tap con su estado anunciado en texto (`aria-label`: "España, visitado, 12 viajes"); y la **lista de países (§6.3) es equivalente al mapa**, navegable por teclado, con la misma información. El globo es la vista principal, no la única.
- Leyenda de los tres estados visible, no oculta tras un icono de ayuda.
- Hit targets **≥ 44px**.
- Tipografía escalable; respetar el tamaño de texto del sistema. Las versalitas espaciadas son el texto más pequeño del sistema (11px) y por eso van siempre en peso 600 y con contraste ≥5:1.
- `prefers-reduced-motion` respetado estrictamente.

---

## 10. Modo oscuro

**No contemplado en v1.**

Si se aborda, la solución por defecto —fondo espacial negro— es justo la que hay que evitar: renunciaría a lo único que hace este globo distinto. El camino es un **cielo nocturno azul profundo** (base `#1B2A3D`) manteniendo la lógica de la paleta, con recálculo completo de §2.3, que está medido contra crema y no se conserva.

---

## 11. Decisiones abiertas

1. **Cabecera visual de la ficha de país.** La maqueta usa una fotografía del lugar, lo que implicaría un asset por país (249) o una API de imágenes. Con las fotos fuera de la v1, las opciones son: (a) banda de color plano derivada de la paleta, (b) el fragmento del mapa de ese país ampliado, (c) sin cabecera, la card a pantalla completa. **La (b) es la única que aporta información en vez de decoración.**
2. **Onboarding.** La maqueta muestra un carrusel de tres pantallas. Para una app de un solo usuario que además la ha construido, un onboarding es coste sin destinatario. Propuesta: conservar la pantalla del splash como **fondo de la pantalla de login** y eliminar el carrusel.
3. **Familia display:** `Bodoni Moda` como propuesta; decidir viéndola con el wordmark "Orbis" real.
4. **Familia de interfaz:** `Inter` por seguridad en cifras tabulares; verificar `tabular-nums` si se cambia.
5. **Trama de la escala:** diagonales es la propuesta. Se decide mirando países pequeños, no grandes — el caso difícil es Luxemburgo, no Brasil.
6. **Relieve del globo:** con sombreado al 8–10% o completamente plano. Decidir sobre el dispositivo real.
7. **Logotipo:** "Orbis" en `.t-mark` funciona como wordmark. La estrella de cuatro puntas puede evolucionar a marca gráfica.

---

*Documento de referencia de estilos — Orbis.*
