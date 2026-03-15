---
name: scaffold
description: Genera la struttura base di un progetto per lo stack scelto con config, linting, test e CI pronti.
trigger: "/scaffold <stack> <nome-progetto>"
---

# /scaffold - Scaffolding Progetto

Workflow per generare da zero la struttura di un progetto con best practice integrate: linting, formatting, testing, CI e configurazione pronta all'uso.

## Trigger

```
/scaffold react my-app
/scaffold express my-api
/scaffold python my-service
/scaffold fullstack my-project
/scaffold next my-saas
```

Se lo stack non e specificato, chiedi con un menu:

```
Scegli lo stack:
1. react     - React 19 + Vite + TypeScript + Tailwind
2. next      - Next.js 15 + TypeScript + Tailwind
3. express   - Express 5 + TypeScript + Node.js
4. fastapi   - FastAPI + Python 3.12 + UV
5. fullstack - Express backend + React frontend (monorepo)
```

## Step 1: Validazione input

- Verifica che il nome progetto sia un nome valido per directory (no spazi, no caratteri speciali eccetto `-` e `_`)
- Verifica che la directory di destinazione non esista gia. Se esiste e non e vuota, interrompi.
- Verifica che i tool necessari siano installati (node, npm/pnpm, python, uv, git)

## Step 2: Creazione struttura

### Stack: React (Vite + TypeScript)

```
<nome>/
  src/
    components/          # Componenti React riutilizzabili
    hooks/               # Custom hooks
    lib/                 # Utility e helper
    styles/              # CSS/Tailwind globals
    App.tsx              # Root component
    main.tsx             # Entry point
  tests/
    setup.ts             # Test setup (vitest)
    components/          # Test componenti
  public/                # Asset statici
  index.html
  package.json
  tsconfig.json
  vite.config.ts
  tailwind.config.ts
  eslint.config.js
  .prettierrc
  .gitignore
```

### Stack: Express (TypeScript)

```
<nome>/
  src/
    routes/              # Route handlers
    middleware/           # Middleware custom
    services/            # Business logic
    lib/                 # Utility e helper
    types/               # TypeScript types/interfaces
    app.ts               # Express app setup
    server.ts            # Entry point con graceful shutdown
  tests/
    setup.ts             # Test setup
    routes/              # Test route
    services/            # Test services
  package.json
  tsconfig.json
  eslint.config.js
  .prettierrc
  .gitignore
  .env.example
```

### Stack: FastAPI (Python)

```
<nome>/
  src/
    <nome_modulo>/
      __init__.py
      main.py            # FastAPI app
      routes/             # Router modules
      services/           # Business logic
      models/             # Pydantic models
      deps.py             # Dependency injection
      config.py           # Settings con pydantic-settings
  tests/
    conftest.py           # Fixtures pytest
    test_routes/
    test_services/
  pyproject.toml
  .python-version
  .gitignore
  .env.example
```

### Stack: Fullstack (Monorepo)

```
<nome>/
  packages/
    server/              # Express (struttura come sopra)
    web/                 # React (struttura come sopra)
    shared/              # Tipi e utility condivisi
      src/
        types/
        utils/
        index.ts
  package.json           # Workspace root
  pnpm-workspace.yaml
  tsconfig.base.json
  turbo.json             # Turborepo config (opzionale)
  .gitignore
```

### Stack: Next.js

```
<nome>/
  src/
    app/                 # App Router
      layout.tsx
      page.tsx
      globals.css
    components/
    hooks/
    lib/
  tests/
    setup.ts
  public/
  package.json
  tsconfig.json
  next.config.ts
  tailwind.config.ts
  eslint.config.js
  .prettierrc
  .gitignore
  .env.example
```

## Step 3: Contenuto dei file

Ogni file generato deve contenere codice funzionante e minimale, non placeholder vuoti.

Regole:
- `package.json`: scripts per `dev`, `build`, `test`, `lint`, `typecheck`
- `tsconfig.json`: strict mode, paths alias (`@/` -> `src/`)
- `.gitignore`: pattern completi per lo stack (node_modules, dist, .env, coverage, IDE files)
- `.env.example`: variabili necessarie con valori placeholder documentati
- Entry point: app che si avvia e risponde (server che ascolta, pagina che renderizza)
- Test setup: almeno un test che passa per verificare che il setup funzioni
- Linting: ESLint flat config per JS/TS, Ruff per Python
- Formatting: Prettier per JS/TS, Ruff format per Python

## Step 4: Inizializzazione

Dopo aver creato i file:

```bash
cd <nome>
git init
# Per Node.js:
npm install   # oppure pnpm install se pnpm-workspace.yaml esiste
# Per Python:
uv sync       # oppure pip install -e ".[dev]"
```

Non eseguire `git add` o `git commit` automaticamente. L'utente decidera quando fare il primo commit.

## Step 5: Verifica

Esegui un smoke test per verificare che tutto funzioni:

```bash
# Node.js
npm run typecheck && npm test

# Python
uv run pytest tests/ -x --tb=short
```

Se il smoke test fallisce, correggi il problema prima di consegnare.

## Step 6: Output finale

```
Progetto "<nome>" creato con stack <stack>.

Struttura: X directory, Y file
Dipendenze: installate
Smoke test: passed

Per iniziare:
  cd <nome>
  npm run dev    # avvia in development mode

Prossimi step consigliati:
  /commit        # primo commit
  git remote add origin <url>
```

## Gestione errori

- **Node/Python non installato**: indica quale runtime manca e come installarlo.
- **Porta gia in uso**: scegli una porta alternativa e documenta nel `.env.example`.
- **Permessi directory**: se la creazione fallisce per permessi, suggerisci un path alternativo.
- **npm install fallisce**: mostra l'errore, suggerisci `npm cache clean --force` e riprova.
- **Stack non supportato**: elenca gli stack disponibili e suggerisci il piu vicino.
