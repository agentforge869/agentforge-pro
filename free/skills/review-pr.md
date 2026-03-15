---
name: review-pr
description: Analizza una Pull Request GitHub, commenta inline sui problemi trovati e suggerisce fix concrete.
trigger: "/review-pr <numero-pr-o-url>"
---

# /review-pr - Code Review Automatica

Workflow per eseguire una review approfondita di una Pull Request GitHub, con commenti inline e suggerimenti actionable.

## Trigger

```
/review-pr 42
/review-pr https://github.com/org/repo/pull/42
```

Se viene passato un URL, estrai owner/repo/numero. Se viene passato solo un numero, usa il repository corrente (`gh repo view --json nameWithOwner`).

## Step 1: Recupero dati PR

Esegui in parallelo:

```bash
gh pr view <numero> --json title,body,author,baseRefName,headRefName,files,additions,deletions,state
gh pr diff <numero>
gh pr checks <numero>
gh api repos/<owner>/<repo>/pulls/<numero>/comments
```

Se la PR e chiusa o merged, avvisa e chiedi se procedere comunque.
Se la PR non esiste, interrompi con errore chiaro.

## Step 2: Analisi strutturale

Classifica ogni file modificato:

| Categoria      | Criteri                                           |
|----------------|---------------------------------------------------|
| **Critico**    | Auth, pagamenti, crypto, accesso DB, middleware    |
| **Importante** | Logica business, API endpoints, modelli dati       |
| **Standard**   | Componenti UI, utility, helper                     |
| **Basso**      | Config, docs, style, dipendenze                    |

Concentra la review sui file critici e importanti. I file a basso rischio ricevono solo una scansione veloce.

## Step 3: Checklist di review

Per ogni file modificato, verifica:

### Correttezza
- [ ] La logica implementa correttamente quanto descritto nella PR description
- [ ] Edge case gestiti (null, undefined, array vuoti, stringhe vuote)
- [ ] Nessun off-by-one, race condition, o deadlock
- [ ] Error handling presente dove serve (try/catch, .catch(), error boundaries)

### Sicurezza
- [ ] Nessun secret hardcoded (API key, password, token)
- [ ] Input validato e sanitizzato prima dell'uso
- [ ] Query parametrizzate (no string interpolation in SQL)
- [ ] Nessun path traversal o command injection
- [ ] Headers di sicurezza presenti (CORS, CSP, HSTS)

### Performance
- [ ] Nessuna query N+1
- [ ] Nessun loop sincrono su operazioni async
- [ ] Nessun memory leak (event listener non rimossi, subscription non chiuse)
- [ ] Bundle size non aumentato senza motivo

### Manutenibilita
- [ ] Naming chiaro e consistente col codebase
- [ ] Nessuna duplicazione di codice (DRY)
- [ ] Funzioni sotto le 30 righe
- [ ] File sotto le 500 righe
- [ ] Test presenti per la nuova logica

### Compatibilita
- [ ] Nessun breaking change nelle API pubbliche senza bump di versione
- [ ] Migrazione database reversibile se applicabile
- [ ] Backward compatibility mantenuta

## Step 4: Generazione commenti

Per ogni problema trovato, genera un commento con questo formato:

```
**[SEVERITY]** filename:riga

Problema: <descrizione concisa del problema>

Suggerimento:
\`\`\`diff
- codice attuale problematico
+ codice suggerito come fix
\`\`\`

Motivazione: <perche e un problema, con riferimento a best practice>
```

Severity:
- `BLOCKING` - deve essere fixato prima del merge (bug, security, data loss)
- `IMPORTANT` - fortemente consigliato (performance, manutenibilita)
- `SUGGESTION` - miglioramento opzionale (style, naming, pattern)
- `QUESTION` - richiesta di chiarimento (logica non ovvia)
- `PRAISE` - codice ben scritto da evidenziare (rinforzo positivo)

## Step 5: Verdetto finale

Dopo aver analizzato tutti i file, emetti un verdetto:

### Approve
Nessun commento BLOCKING o IMPORTANT. La PR e pronta per il merge.

### Request Changes
Almeno un commento BLOCKING. Elenca i blockers in ordine di priorita.

### Comment
Solo commenti IMPORTANT o SUGGESTION. La PR e quasi pronta ma beneficerebbe di modifiche.

## Step 6: Output strutturato

```markdown
## Review PR #42: "<titolo>"

**Verdetto**: Request Changes
**File analizzati**: 12 (4 critici, 5 importanti, 3 standard)
**Problemi trovati**: 2 blocking, 3 important, 5 suggestion, 1 praise

### Blockers
1. `src/auth/login.ts:45` - SQL injection in query utente
2. `src/api/payment.ts:112` - Manca validazione importo negativo

### Suggerimenti importanti
1. `src/utils/cache.ts:23` - Memory leak: listener non rimosso
2. ...

### Note positive
1. `src/middleware/rate-limit.ts` - Ottima implementazione sliding window
```

## Gestione errori

- **`gh` non installato**: istruisci l'installazione con `winget install GitHub.cli` o `brew install gh`.
- **Non autenticato**: suggerisci `gh auth login`.
- **PR con 100+ file**: avvisa che la review sara parziale, concentrati sui file critici e importanti.
- **Diff troppo grande (>5000 righe)**: analizza per batch, inizia dai file critici.
- **Repository privato senza accesso**: errore chiaro con istruzioni per ottenere accesso.
