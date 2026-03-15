---
name: deploy-check
description: Esegue una checklist pre-deploy completa verificando build, test, sicurezza, variabili d'ambiente e dipendenze.
trigger: "/deploy-check"
---

# /deploy-check - Pre-Deploy Checklist

Workflow che esegue una serie di verifiche automatiche prima di un deploy in produzione. Ogni check produce un risultato PASS/FAIL/WARN con dettagli actionable.

## Trigger

```
/deploy-check
/deploy-check --env staging
/deploy-check --skip security
```

Opzioni:
- `--env <nome>`: specifica l'ambiente target (default: production)
- `--skip <check>`: salta un check specifico (per CI dove alcuni check sono gestiti altrove)

## Step 1: Rilevamento progetto

Identifica automaticamente lo stack analizzando i file nella root:

| File presente          | Stack rilevato      |
|------------------------|---------------------|
| `package.json`         | Node.js             |
| `pyproject.toml`       | Python              |
| `Cargo.toml`           | Rust                |
| `go.mod`               | Go                  |
| `docker-compose.yml`   | Docker              |
| `Dockerfile`           | Docker              |
| `next.config.*`        | Next.js             |
| `vite.config.*`        | Vite                |

Adatta i check successivi allo stack rilevato.

## Step 2: Check build

**Obiettivo**: verificare che il progetto compili senza errori.

```bash
# Node.js
npm run build 2>&1

# Python
uv run python -m py_compile src/**/*.py

# Rust
cargo build --release 2>&1
```

Risultati:
- `PASS` - build completata senza errori
- `FAIL` - errori di compilazione (mostra i primi 20 errori)
- `WARN` - build OK ma con warning (mostra i warning)

## Step 3: Check test

**Obiettivo**: tutti i test devono passare.

```bash
# Node.js
npm test -- --reporter=json 2>&1

# Python
uv run pytest --tb=short -q 2>&1
```

Risultati:
- `PASS` - tutti i test passano
- `FAIL` - test falliti (elenca nome e motivo di ogni fallimento)
- `WARN` - nessun test trovato (progetto senza test suite)

Opzionale: controlla coverage se configurata. Segnala `WARN` se sotto il 60%.

## Step 4: Check typecheck

**Obiettivo**: nessun errore di tipo.

```bash
# TypeScript
npx tsc --noEmit 2>&1

# Python (se mypy/pyright configurato)
uv run mypy src/ 2>&1
```

Risultati:
- `PASS` - zero errori di tipo
- `FAIL` - errori di tipo presenti (elenca i primi 15)
- `SKIP` - nessun type checker configurato

## Step 5: Check sicurezza

**Obiettivo**: nessuna vulnerabilita nota nelle dipendenze e nel codice.

### 5a. Dipendenze vulnerabili

```bash
# Node.js
npm audit --json 2>&1

# Python
uv run pip-audit --json 2>&1
```

### 5b. Secrets nel codice

Cerca pattern pericolosi nei file tracked da git:

```
# Pattern da cercare (case insensitive)
password\s*=\s*["'][^"']+["']
api[_-]?key\s*=\s*["'][^"']+["']
secret\s*=\s*["'][^"']+["']
token\s*=\s*["'][^"']+["']
-----BEGIN (RSA |EC )?PRIVATE KEY-----
AWS_SECRET_ACCESS_KEY
ANTHROPIC_API_KEY\s*=\s*["']sk-
```

Escludi: `.env.example`, `*.test.*`, `*.spec.*`, `node_modules`, `dist`, `.git`.

### 5c. File sensibili tracciati

Verifica che `.gitignore` copra: `.env`, `*.pem`, `*.key`, `credentials.*`, `serviceAccountKey.*`.

Risultati:
- `PASS` - nessuna vulnerabilita critica, nessun secret esposto
- `FAIL` - vulnerabilita critiche o high, oppure secrets trovati nel codice
- `WARN` - vulnerabilita moderate o low

## Step 6: Check variabili d'ambiente

**Obiettivo**: tutte le variabili necessarie sono definite.

1. Trova `.env.example` o `.env.template`
2. Confronta con `.env` attuale (o con le variabili d'ambiente del sistema)
3. Segnala variabili mancanti

```bash
# Confronto
comm -23 <(grep -oP '^[A-Z_]+' .env.example | sort) <(grep -oP '^[A-Z_]+' .env | sort)
```

Inoltre verifica:
- `NODE_ENV` o equivalente impostato a `production`
- URL del database non punta a localhost
- URL di API esterne non puntano a endpoint di staging/dev
- Nessuna variabile con valore placeholder (`changeme`, `xxx`, `TODO`)

Risultati:
- `PASS` - tutte le variabili presenti con valori non-placeholder
- `FAIL` - variabili critiche mancanti (DATABASE_URL, API_KEY, ecc.)
- `WARN` - variabili opzionali mancanti

## Step 7: Check dipendenze

**Obiettivo**: dipendenze pulite e aggiornate.

```bash
# Node.js - lockfile in sync
npm ls --json 2>&1

# Dipendenze outdated (solo major)
npm outdated --json 2>&1
```

Verifica:
- Lockfile presente e in sync con package.json / pyproject.toml
- Nessuna dipendenza con major version obsoleta (>2 major dietro)
- Nessuna dipendenza deprecated

Risultati:
- `PASS` - lockfile in sync, nessuna dipendenza critica outdated
- `FAIL` - lockfile mancante o out of sync
- `WARN` - dipendenze outdated non critiche

## Step 8: Check git

**Obiettivo**: repository in stato pulito e pronto per deploy.

```bash
git status --porcelain
git log --oneline -1
git branch --show-current
```

Verifica:
- Nessun file uncommitted (working tree pulito)
- Branch corrente e quello atteso per il deploy (main, master, release/*)
- Nessun merge conflict pendente

Risultati:
- `PASS` - repository pulito su branch corretto
- `FAIL` - file uncommitted o branch sbagliato
- `WARN` - su branch non-standard ma repository pulito

## Step 9: Report finale

```
============================================
  DEPLOY CHECK - <nome-progetto>
  Ambiente: production
  Data: 2026-03-14 15:30:00
============================================

  Build        PASS
  Test         PASS  (142 passed, 0 failed)
  Typecheck    PASS
  Security     WARN  (2 moderate vulnerabilities)
  Env vars     PASS
  Deps         PASS
  Git          PASS

--------------------------------------------
  RISULTATO:   READY (con warning)
--------------------------------------------

Warning:
  1. npm audit: 2 moderate in `lodash` (non exploitable in questo contesto)

Prossimo step:
  git push origin main   # oppure il comando di deploy specifico
```

Verdetti possibili:
- `READY` - tutti i check PASS, deploy sicuro
- `READY (con warning)` - solo WARN, deploy possibile ma rivedi i warning
- `NOT READY` - almeno un FAIL, risolvi prima di deployare

## Gestione errori

- **Tool mancanti** (npm, git, ecc.): segnala quale tool manca ma continua con gli altri check.
- **Timeout su npm audit**: segnala WARN e procedi, il registry potrebbe essere temporaneamente lento.
- **Progetto senza package.json/pyproject.toml**: segnala che il tipo di progetto non e stato rilevato e elenca i check eseguibili.
- **Monorepo**: esegui i check per ogni workspace/package e aggrega i risultati.
