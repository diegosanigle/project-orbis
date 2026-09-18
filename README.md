# Orbis

App privada, de un solo usuario, para registrar viajes y visualizarlos sobre un globo terráqueo 3D — con el porcentaje de países y de superficie del mundo visitado.

No es un producto. Está pensada para un único usuario y prioriza simplicidad sobre escalabilidad.

## Documentación del proyecto

- **[`PLAN.md`](./PLAN.md)** — fases de construcción, modelo de datos, métricas y todas las decisiones de producto ya cerradas.
- **[`orbis-design-system.md`](./orbis-design-system.md)** — paleta, tipografía, componentes y accesibilidad.
- **[`CLAUDE.md`](./CLAUDE.md)** — convenciones para trabajar en este repo con Claude Code.

Antes de tocar código o diseño, leer el documento correspondiente. Este README no repite su contenido.

## Stack

- [Vite](https://vitejs.dev) + JavaScript vanilla (sin framework)
- [globe.gl](https://globe.gl) (sobre Three.js) para el globo 3D
- [Supabase](https://supabase.com) (Postgres + Auth) como backend
- [Cloudflare Pages](https://pages.cloudflare.com) para el hosting
- `marked` + `DOMPurify` para las notas en Markdown

## Requisitos

- Node.js LTS
- Una cuenta de Supabase con un proyecto creado (ver `PLAN.md`, Fase 3)

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # rellenar con las claves del proyecto de Supabase
npm run dev
```

Variables de entorno necesarias en `.env.local`:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

La `anon key` de Supabase está diseñada para ir en el cliente; la protección de los datos la da la RLS, no ocultar esta clave. La `service_role key` nunca debe entrar en este proyecto.

## Scripts

```bash
npm run dev       # servidor de desarrollo
npm run build     # build de producción a /dist
npm run preview   # sirve el build localmente
```

## Estructura del proyecto

```
orbis/
├── PLAN.md                      Fases de construcción y decisiones de producto
├── orbis-design-system.md       Paleta, tipografía, componentes, accesibilidad
├── CLAUDE.md                    Convenciones para trabajar en el repo con Claude Code
├── README.md
├── .env.example
├── .env.local                   (no versionado — claves de Supabase)
├── .gitignore
├── package.json
├── vite.config.js
├── index.html                   Punto de entrada de Vite
│
├── public/
│   └── data/                    Estático, solo lectura — nunca va a Supabase (ver PLAN.md §5)
│       ├── paises.json          { iso_a3, iso_a2, nombre_es, continente, area_km2 } — 249 entradas
│       ├── paises.geojson       Polígonos admin-0 (Natural Earth 1:50m, simplificados)
│       └── subdivisiones/
│           ├── ES.geojson
│           ├── ES.json          { codigo_iso_3166_2, nombre, area_km2 } — provincias
│           ├── PT.geojson
│           ├── PT.json          Distritos + Azores/Madeira como entidades propias
│           ├── FR.geojson
│           ├── FR.json          Régions
│           ├── IT.geojson
│           ├── IT.json          Regioni
│           ├── US.geojson
│           └── US.json          Estados + DC
│
├── scripts/                     Herramientas de la Fase 2 — no se despliegan, uso puntual
│   ├── build-paises.js          Genera paises.json desde Natural Earth / REST Countries
│   ├── build-subdivisiones.js   Genera los JSON/GeoJSON de subdivisiones por país
│   └── validate-iso.js          Cruza códigos ISO entre GeoJSON y paises.json (ver PLAN.md §7,
│                                 mitigación del riesgo principal del proyecto)
│
└── src/
    ├── main.js                  Punto de entrada: auth guard, montaje de la vista inicial
    ├── style.css                Variables CSS del design system (tokens de §2–§5)
    │
    ├── lib/                     Lógica pura, sin dependencias del DOM — testeable en aislado
    │   ├── supabase.js          Cliente de Supabase
    │   ├── stats.js             % países, % superficie, nº países, contador de transitados
    │   ├── geo.js                Cruce pais_iso ↔ GeoJSON, carga perezosa de subdivisiones
    │   └── markdown.js          Render de notas: marked + sanitizado con DOMPurify
    │
    ├── views/                   Una vista = una pantalla completa
    │   ├── login.js
    │   ├── globe.js             Vista principal (§6.1 del design system)
    │   ├── countryList.js       Vista de lista — equivalente accesible al globo (§6.3)
    │   ├── countryDetail.js     Ficha de país (§6.4)
    │   ├── tripForm.js          Alta/edición de viaje
    │   ├── timeline.js
    │   └── dashboard.js
    │
    └── components/              Piezas reutilizadas entre vistas
        ├── navBar.js            Navegación inferior (§6.10)
        ├── sheet.js             Hoja modal (§6.9)
        └── chip.js              Chips y selectores (§6.6)
```

**Notas sobre la estructura:**
- `scripts/` no se importa desde `src/`: son utilidades de línea de comandos para preparar los datos de `public/data`, se ejecutan una vez (o al ampliar países) y no forman parte del bundle de producción.
- Cada fichero de `lib/` exporta funciones puras — es lo que permite probarlas sin montar la UI (ver `CLAUDE.md`, regla de funciones puras).
- No hay carpeta `models/` ni ORM: el esquema vive únicamente en Supabase (`PLAN.md` §5) y en los tipos que devuelve su cliente.

## Despliegue

Cloudflare Pages, conectado a este repositorio. Build command `npm run build`, output directory `dist`. Variables de entorno configuradas en el panel de Cloudflare, no en el repo.
