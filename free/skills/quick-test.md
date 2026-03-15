---
name: quick-test
description: Esegue solo i test impattati dalle modifiche recenti, usando git diff per determinare i file coinvolti.
trigger: "/quick-test"
---

# /quick-test - Test delle Sole Modifiche

Workflow per eseguire solo i test rilevanti rispetto alle modifiche correnti, evitando di lanciare l'intera test suite.

## Trigger

```
/quick-test              # test relativi ai file modificati (unstaged + staged)
/quick-test --staged     # solo file staged (utile pre-commit)
/quick-test --last       # test relativi all'ultimo commit
/quick-test src/auth/    # test relativi a una directory specifica
```

## Step 1: Identificazione file modificati

```bash
# File modificati (staged + unstaged)
git diff --name-only HEAD 2>/dev/null
git diff --name-only --cached 2>/dev/null

# Oppure per ultimo commit
git diff --name-only HEAD~1 HEAD 2>/dev/null
```

Filtra solo file sorgente rilevanti (escludi lock file, config, asset statici):
- Includi: `*.ts`, `*.tsx`, `*.js`, `*.jsx`, `*.py`, `*.rs`, `*.go`
- Escludi: `*.lock`, `*.json` (tranne se in `src/`), `*.md`, `*.css`, `*.svg`

Se non ci sono file modificati, interrompi con:
> Nessuna modifica rilevata. Niente da testare.

## Step 2: Rilevamento test runner

Identifica il test runner del progetto:

```bash
# Cerca configurazione test
ls jest.config.* vitest.config.* pytest.ini pyproject.toml .mocharc.* 2>/dev/null

# Verifica nei script di package.json
grep -o '"test":\s*"[^"]*"' package.json 2>/dev/null
```

| Runner     | Rilevamento                        | Comando related tests                            |
|------------|------------------------------------|--------------------------------------------------|
| **Jest**   | `jest.config.*` o `"jest"` in deps | `npx jest --findRelatedTests <files>`            |
| **Vitest** | `vitest.config.*`                  | `npx vitest --changed`                           |
| **Pytest** | `pytest.ini` o `pyproject.toml`    | `python -m pytest <test_files> --no-header -q`   |
| **Mocha**  | `.mocharc.*`                       | `npx mocha <test_files>`                         |

## Step 3: Mappatura file -> test

Per ogni file modificato, trova i test correlati:

### Strategia 1: Convenzione di naming
```
src/auth/login.ts        -> tests/auth/login.test.ts
src/utils/parse.ts       -> src/utils/__tests__/parse.test.ts
src/components/Button.tsx -> src/components/Button.spec.tsx
```

### Strategia 2: Import tracing (se la convenzione non basta)
Cerca con Grep quali file di test importano i moduli modificati:
```
Grep per "from.*<modulo-modificato>" nei file *.test.* e *.spec.*
```

### Strategia 3: Built-in del runner
Se il runner supporta `--findRelatedTests` o `--changed`, usa quello direttamente perche analizza il dependency graph completo.

## Step 4: Esecuzione test

Esegui i test correlati con output dettagliato:

```bash
# Jest
npx jest --findRelatedTests src/auth/login.ts src/utils/parse.ts --verbose 2>&1

# Vitest
npx vitest run --changed --reporter=verbose 2>&1

# Pytest
python -m pytest tests/test_auth.py tests/test_parse.py -v 2>&1
```

Se nessun test correlato viene trovato:
> Nessun test trovato per i file modificati. I file modificati non hanno test coverage.
> File senza test: `src/auth/login.ts`, `src/utils/parse.ts`

## Step 5: Analisi risultati

Se tutti i test passano, mostra il report e termina.

Se ci sono fallimenti:
1. Leggi l'output del test fallito
2. Identifica se il fallimento e causato dalla modifica corrente o era pre-esistente
3. Per fallimenti causati dalla modifica: mostra il file, la riga e il motivo probabile

## Step 6: Output finale

```
QUICK TEST COMPLETATO

File modificati:    4
Test eseguiti:     12 (su 347 totali)
Tempo:             1.8s (vs ~45s full suite)

Risultati:
  PASS  tests/auth/login.test.ts        (6 test)
  PASS  tests/utils/parse.test.ts       (4 test)
  FAIL  tests/api/router.test.ts        (2 test, 1 fallito)

Fallimenti:
  tests/api/router.test.ts > "should validate input"
    Expected: 400
    Received: 200
    Causa probabile: la modifica a src/api/router.ts:34 ha rimosso
    la validazione del campo `email`

File senza test coverage:
  src/middleware/cors.ts (nessun test trovato)
```
