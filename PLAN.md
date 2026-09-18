# PLAN.md — Orbis (mapa de viajes 3D)

Documento de referencia del proyecto. Se le pasa a Claude Code al arrancar cada fase.
No es el `CLAUDE.md` (ese debe ser corto y contener solo convenciones estables).

---

## 1. Objetivo

**Orbis** es una aplicación web **privada, de un solo usuario**, para registrar todos los
viajes realizados
y visualizarlos sobre un globo terráqueo 3D interactivo, con métricas de porcentaje de
mundo visitado.

No es un producto. No hay usuarios más allá del propietario. Toda decisión de diseño debe
optimizar **simplicidad y mantenibilidad**, no escalabilidad ni extensibilidad especulativa.

---

## 2. Decisiones cerradas

### Métricas

| Métrica | Definición |
|---|---|
| **% de países** | Sobre denominador fijo de **249** (todos los códigos ISO 3166-1: los 193 miembros de la ONU + territorios y dependencias con código propio) |
| **% de superficie** | Suma de áreas (km²) de países visitados / superficie terrestre mundial |
| **Nº de países** | Contador absoluto |

- Un país cuenta como visitado si existe ≥1 viaje de tipo `visita` en él.
- El modelo es **binario a nivel país**: haber estado en una sola provincia de España
  marca España como visitada al 100% para el cómputo mundial. Las subdivisiones son una
  capa de detalle adicional, no afectan al % global.

### Subdivisiones

Solo para países explícitamente activados. Resto del mundo: sin subdivisiones.

| País | Nivel | Nº aprox. |
|---|---|---|
| España | **Provincias** (2º nivel, decisión deliberada) | ~50 + Ceuta/Melilla |
| Portugal | Distritos + regiones autónomas (Azores y Madeira como entidades propias) | ~20 |
| Francia | Régions (1er nivel) — confirmado | 13 metropolitanas + ultramar |
| Italia | Regioni (1er nivel) | 20 |
| EEUU | Estados (1er nivel) | 50 + DC |

Ampliable país a país en el futuro. No cargar subdivisiones de países no activados.

### Escalas de aeropuerto

- Tipo de viaje distinto: `escala` vs `visita`.
- Colorea el país en el globo con un **color propio** (tercer estado visual).
- **No** cuenta para el nº de países, ni para el % de países, ni para el % de superficie.
  El área de un aeropuerto (~30 km² en Barajas) frente a los ~149.000.000 km² de
  superficie terrestre mundial es numéricamente irrelevante (0,00002%); sumarla no movería
  nunca el contador. Se muestra aparte un contador simple "países transitados: N".

### Territorios y dependencias

Se identifican mediante **ISO 3166-1 completo**, que ya asigna a cada territorio
dependiente un código propio e independiente de su país soberano: Groenlandia = `GRL`
(no una subdivisión de `DNK`), Hong Kong = `HKG` (no de `CHN`), Puerto Rico = `PRI` (no
de `USA`).

Con el denominador fijado en 249 (§ Métricas), **todos los códigos ISO 3166-1 cuentan
por igual** para el % de países y para el % de superficie. No hace falta distinguir
miembros de la ONU de territorios, ni un campo `es_onu`, ni `parent_iso`: cada entrada
es independiente y pesa lo mismo que cualquier otra. Un viaje con `pais_iso = GRL`
nunca toca las filas con `pais_iso = DNK` — son entidades completamente separadas en el
modelo de datos, así que la pregunta "¿el territorio marca al país soberano?" no puede
darse: estructuralmente no ocurre.

- `paises.json` cubre **todo ISO 3166-1** (~249 entradas), cada una con su `area_km2`
  propia. Sin campos de exclusión: todas cuentan igual.

### Notas

Texto enriquecido en **Markdown**, renderizado sanitizado.

### Autenticación

Supabase Auth, email/password, **un único usuario**. Registro público desactivado tras
crear la cuenta.

### Fuera de v1 (explícitamente)

Fotos · Wishlist · Import de Google Timeline · Multiusuario · Compartir públicamente ·
Recomendaciones con IA · Subdivisiones de países no listados.

No implementar nada de esto aunque parezca fácil. Cada añadido es superficie de
mantenimiento en un proyecto personal que debe llegar a producción.

---

## 3. Decisiones abiertas

Ninguna. Escalas (opción A), territorios (ISO 3166-1 completo) y Francia (régions, primer
nivel de subdivisión, igual que Italia y EEUU) quedaron resueltos en la sección 2.
Cerrado provisionalmente en régions por coherencia con "primer nivel de subdivisión".
Cambiarlo después implica rehacer el dataset de Francia.

---

## 4. Stack

| Capa | Elección | Motivo |
|---|---|---|
| Globo 3D | **globe.gl** (sobre Three.js) | Única opción diseñada para globos interactivos con polígonos clicables. Leaflet es 2D y no sirve. Cesium es GIS pesado y desproporcionado. |
| Build | **Vite** | Con Three.js de por medio, el vanilla sin bundler da problemas reales de imports. |
| Lenguaje | **JS vanilla** (sin framework) | La app tiene pocas vistas y poco estado. React añadiría complejidad sin beneficio. |
| Backend / DB | **Supabase** (Postgres + Auth) | Ya conocido, tier gratuito sobrado para este volumen. |
| Markdown | `marked` + `DOMPurify` | Renderizado sanitizado obligatorio. |
| Hosting | **Cloudflare Pages** | Gratuito, deploy desde git. |
| Datos geográficos | **Natural Earth** (admin-0 1:50m, admin-1) | Dominio público. Alternativa para subdivisiones si el nivel no encaja: geoBoundaries.org. |

---

## 5. Modelo de datos

### En Supabase (datos del usuario)

```
viajes
  id              uuid pk
  user_id         uuid  fk auth.users
  pais_iso        text          -- ISO 3166-1 alpha-3
  subdivision_iso text  null    -- ISO 3166-2, ej "ES-M", "US-TX"
  lugar           text  null    -- texto libre: ciudad, zona
  fecha_inicio    date
  fecha_fin       date  null
  tipo            text          -- enum: 'visita' | 'escala'
  notas           text  null    -- markdown
  created_at      timestamptz

índices: (user_id), (user_id, pais_iso)
```

### Estáticos en `/public/data` (solo lectura, no van a la base de datos)

```
paises.json          { iso_a3, iso_a2, nombre_es, continente, area_km2 }
paises.geojson       polígonos admin-0, simplificados
subdivisiones/ES.geojson, PT, FR, IT, US
subdivisiones/ES.json  { codigo_iso_3166_2, nombre, pais_iso, area_km2 }
```

**Regla:** el estado "visitado" nunca se almacena. Se deriva siempre de la tabla `viajes`.
Guardar un booleano `visitado` en paralelo garantiza desincronización.

---

## 6. Fases

### FASE 1 — Entorno

1. Node LTS + Claude Code instalados y verificados.
2. Carpeta del proyecto con `git init`. Trabajar sin git con un agente es renunciar a
   poder revertir.
3. Repo en GitHub (privado recomendado, aunque con RLS correcta público sería aceptable).
4. `claude` + `/init` para generar `CLAUDE.md`.
5. Editar `CLAUDE.md` a mano: stack, convenciones, referencia a este `PLAN.md`, y lista
   explícita de lo que NO debe implementar. **Mantenerlo corto** — se carga en cada
   petición.
6. Conectar el MCP de Supabase a Claude Code (`claude mcp add`).
7. Método de trabajo: **plan mode (Shift+Tab) antes de cada fase**, revisión de diff y
   commit al terminar cada paso que funcione. Nunca encadenar varias fases sin revisar.

### FASE 2 — Datos geográficos

La fase más subestimada y la que más deuda genera si se hace mal. Hacerla **antes** de
escribir la app.

1. Descargar Natural Earth admin-0 a **1:50m** (no 1:10m: el detalle extra no se aprecia
   en un globo y penaliza el rendimiento en móvil).
2. Descargar Natural Earth admin-1 y **recortar solo ES, PT, FR, IT, US**.
3. **Verificar qué nivel administrativo devuelve realmente cada país abriendo el fichero
   y contando entidades.** Si España sale con 17 entidades son CCAA, no provincias: en ese
   caso hay que recurrir a geoBoundaries ADM2. No dar por supuesto el nivel.
4. Confirmar que Azores y Madeira aparecen como entidades separadas en el dataset PT.
5. Construir `paises.json` con **todo ISO 3166-1** (~249 entradas). Sin campos de
   exclusión: todas cuentan igual para ambas métricas (§2). Áreas desde Natural Earth o
   REST Countries. Script: `scripts/build-paises.js`.
6. Construir los JSON de subdivisiones con área por entidad. Script:
   `scripts/build-subdivisiones.js`.
7. **Normalizar códigos ISO.** Natural Earth tiene inconsistencias conocidas en casos
   disputados (Kosovo, Somalilandia, Chipre del Norte, Sáhara Occidental). Decidir el
   tratamiento y dejarlo documentado en el propio repo.
8. **Simplificar geometría** con mapshaper o turf. Objetivo: que el GeoJSON mundial pese
   lo mínimo viable sin que los países se deformen.
9. Guardar todo en `/public/data`.

**Criterio de salida:** los ficheros existen, los códigos cruzan, y un script de
comprobación confirma que la suma de áreas de los 249 códigos es del orden de la
superficie terrestre esperada.

### FASE 3 — Supabase

1. Proyecto nuevo, separado de cualquier otro existente.
2. Auth email/password. Crear el usuario. **Desactivar el registro público después** — si
   no, cualquiera puede darse de alta.
3. Crear tabla `viajes` según sección 5, con sus índices.
4. **RLS activada** en todas las tablas, policies `auth.uid() = user_id` para
   select/insert/update/delete.
5. **Verificar la RLS a mano**: intentar leer la tabla con la anon key sin sesión y
   comprobar que devuelve vacío. No dar por hecho que funciona.

Nota: la `anon key` de Supabase está diseñada para ir en el cliente y es pública. Lo que
protege los datos es la RLS, no ocultar la key. La que nunca debe salir del servidor ni
aparecer en el repo es la `service_role key`.

### FASE 4 — Scaffold

1. `npm create vite` (vanilla JS).
2. Dependencias: `globe.gl`, `@supabase/supabase-js`, `marked`, `dompurify`.
3. `.env.local` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. `.env*` en
   `.gitignore`.
4. Estructura del proyecto: ver **`README.md`** ("Estructura del proyecto"). Crearla
   completa en este paso, aunque la mayoría de ficheros empiecen vacíos — evita tener que
   reorganizar imports en fases posteriores.
5. Commit del scaffold funcionando antes de añadir nada.

### FASE 5 — Construcción, en orden de dependencia

Cada punto = una tarea de Claude Code con commit al final.

1. **Login.** Pantalla de Supabase Auth, sesión persistente, guard de rutas. Primero,
   porque todo lo demás depende de `user_id`.
2. **Globo desnudo.** globe.gl con el GeoJSON mundial: rotación, zoom, click → nombre del
   país. Sin datos, sin estilo.
   **Probar rendimiento en iPhone real aquí.** Si va mal, el momento de simplificar
   geometría es este, no al final.
3. **CRUD de viajes.** Formulario sin estilo (país, subdivisión, fechas, lugar, tipo) +
   listado. Validar escritura y lectura contra Supabase.
4. **Coloreado del globo.** Cruce de `pais_iso` con el GeoJSON. Tres estados: no visitado
   / escala / visitado. Aquí afloran los desajustes de códigos ISO de la Fase 2.
5. **Motor de estadísticas** en `/src/lib/stats.js`. Funciones puras, aisladas de la UI:
   % países sobre 249, % superficie, nº de países, contador de transitados, desglose por
   continente. Probar con los casos límite de la sección 7.
6. **Drill-down de subdivisiones.** Click en ES/PT/FR/IT/US → carga **perezosa** del
   GeoJSON de ese país y render de sus polígonos. Nunca cargar los cinco a la vez.
7. **Editor de notas Markdown.** Textarea + preview. Sanitizar con DOMPurify **antes** de
   insertar en el DOM.
8. **Vista de lista de países.** Equivalente funcional al globo: los 249 países con su estado
   (visitado / escala / no visitado), filtrable y **navegable por teclado**. No es una
   pantalla secundaria ni un extra de accesibilidad: un mapa que codifica el estado por
   relleno no es utilizable sin ella (ver `orbis-design-system.md` §9). Debe dar acceso a
   exactamente la misma información que el globo.
9. **Timeline.** Lista cronológica filtrable por año.
10. **Ficha de país.** Viajes allí, subdivisiones visitadas, notas. UI sobre datos ya
   existentes.
11. **Dashboard de estadísticas.** Continentes, país más repetido, viajes por año.

### FASE 6 — Diseño

El sistema visual está definido en **`orbis-design-system.md`** (paleta, tipografía,
espaciado, componentes, accesibilidad). Esta fase lo aplica; no lo reabre.

1. **Mockup antes de aplicar.** No empezar a estilar directamente sobre el código.
2. Resolver las decisiones abiertas del §11 del design system (familia display, sesgo de
   `--ink-2`, trama de la escala, textura del mar).
3. Aplicar tokens de color y tipografía como variables CSS, en un único fichero.
4. Navegación móvil: tab bar inferior fija.
5. Skeletons de carga. El GeoJSON tarda y sin feedback la app parece rota.

### FASE 7 — Pruebas y pulido

1. **Cargar los viajes reales**, no datos de prueba. Es la única forma de ver si el % tiene
   sentido a ojo y si el flujo de alta soporta introducir años de historial.
2. Rendimiento en iPhone real: fluidez de rotación, tiempo de carga inicial, memoria con
   subdivisiones abiertas.
3. Reverificar RLS después de todos los cambios.
4. Comprobar el cálculo a mano en 2-3 casos.
5. Estados vacíos: qué se ve con 0 viajes.

### FASE 8 — Producción

1. Cloudflare Pages conectado al repo. Build `npm run build`, output `dist`.
2. Variables de entorno en el panel de Cloudflare.
3. Deploy y verificación en móvil y escritorio.
4. **Export/backup de los viajes a JSON o CSV.** No dejar el historial en un único sitio
   sin copia.

---

## 7. Casos límite y riesgos

**Riesgos principales**

- *Desajuste de códigos ISO entre Natural Earth y el JSON de países.* Es el fallo más
  probable de todo el proyecto. Se manifiesta como países que nunca se colorean. Mitigación:
  `scripts/validate-iso.js`, que lista los códigos del GeoJSON sin correspondencia en
  `paises.json` y viceversa. Ejecutarlo al final de la Fase 2 y de nuevo si se amplía el
  dataset.
- *Rendimiento del globo en móvil.* Three.js puede ir lento en dispositivos antiguos.
  Mitigación: probar en el dispositivo real en el paso 5.2, no al final.
- *Peso de carga inicial.* GeoJSON mundial + texturas. Mitigación: simplificación de
  geometría y carga perezosa de subdivisiones.
- *Alcance creciente.* Es una app personal; el riesgo real es no terminarla. La sección
  "fuera de v1" es vinculante.

**Casos límite a cubrir en los cálculos**

- 0 viajes registrados → 0%, sin división por cero.
- Mismo país visitado varias veces → cuenta una sola vez.
- País con escala y además visita → prevalece `visita`.
- Viaje sin `fecha_fin` (viaje de un día o en curso).
- Viaje a subdivisión de un país sin registro a nivel país → el país debe contar igualmente.
- Territorio con código ISO propio (ej. `GRL`, `HKG`) visitado: cuenta como una entrada
  más del /249 y suma su área real, sin alterar el estado de su país soberano (`DNK`,
  `CHN`) — son entidades independientes, no debería ni poder cruzarse el dato.
- País presente en el GeoJSON pero ausente de `paises.json`, y viceversa.
- Nota vacía o con HTML malicioso pegado.

---

## 8. Criterios de calidad

El proyecto se considera terminado cuando:

- [ ] El globo rota, hace zoom y responde al click con fluidez en iPhone.
- [ ] Los países visitados, transitados y no visitados se distinguen sin ambigüedad.
- [ ] La vista de lista da acceso a la misma información que el globo y es navegable por
      teclado.
- [ ] Las cinco listas de subdivisiones cargan y se pintan correctamente.
- [ ] El % de países y el % de superficie coinciden con un cálculo manual de contraste.
- [ ] Todos los casos límite de la sección 7 están cubiertos y probados.
- [ ] La RLS impide leer datos sin sesión (verificado, no supuesto).
- [ ] El historial real de viajes está cargado y respaldado.
- [ ] La app está desplegada en Cloudflare Pages y accesible desde móvil.

Se considera **incompleto** si: el % se calcula pero no se ha contrastado a mano; la RLS
está "activada" pero no verificada; o el rendimiento en móvil solo se ha probado en el
simulador.

---

## 9. Convenciones para Claude Code

- No añadir funcionalidades no pedidas. Si detectas algo que falta, proponlo, no lo
  implementes.
- Mantener la solución lo más simple posible. Este proyecto no necesita abstracciones.
- La lógica de cálculo va en funciones puras aisladas de la UI, para poder probarla.
- Un commit por paso funcional. Mensajes descriptivos.
- Señalar explícitamente cualquier decisión técnica relevante tomada sobre la marcha.
- Ante una ambigüedad del plan, preguntar en lugar de asumir.
