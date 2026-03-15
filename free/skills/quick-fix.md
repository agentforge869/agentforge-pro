---
name: quick-fix
description: Dato un errore (stack trace, messaggio, screenshot), individua la causa nel codebase e applica la fix.
trigger: "/quick-fix <errore o descrizione>"
---

# /quick-fix - Fix Veloce

Workflow per diagnosticare un errore, trovare la root cause nel codebase e applicare la correzione nel minor tempo possibile.

## Trigger

```
/quick-fix TypeError: Cannot read properties of undefined (reading 'map')
/quick-fix "il bottone login non funziona"
/quick-fix           # senza argomenti: legge l'ultimo errore dal terminale
```

Input accettati:
- Stack trace completo (incollato o da terminale)
- Messaggio di errore singolo
- Descrizione in linguaggio naturale del problema
- Path a uno screenshot dell'errore
- Nessun argomento: cerca l'ultimo errore nell'output del terminale corrente

## Step 1: Acquisizione errore

### Se viene fornito uno stack trace

Parsa lo stack trace ed estrai:
- **Tipo errore**: TypeError, ReferenceError, SyntaxError, HTTP 500, ecc.
- **Messaggio**: la descrizione dell'errore
- **File e riga**: il punto esatto dove l'errore e stato lanciato
- **Call stack**: la catena di chiamate che ha portato all'errore

### Se viene fornita una descrizione testuale

Cerca nei log recenti del progetto:
```bash
# Node.js - cerca nei log di sviluppo
npm run dev 2>&1 | tail -50

# Cerca errori recenti nei file di log
find . -name "*.log" -newer package.json -exec grep -l "error\|Error\|ERROR" {} \;
```

### Se nessun input

Leggi l'output recente del terminale e cerca pattern di errore:
```
Error:
ERR!
FAIL
Exception
TypeError
SyntaxError
Cannot find
Module not found
ENOENT
ECONNREFUSED
```

Se non trova nessun errore, interrompi con:
> Nessun errore rilevato. Incolla lo stack trace o descrivi il problema.

## Step 2: Localizzazione nel codebase

Partendo dalle informazioni raccolte, localizza il codice responsabile.

### Strategia di ricerca (in ordine di priorita)

1. **File esatto dallo stack trace**: se lo stack indica `src/auth/login.ts:45`, leggi quel file e quella riga.

2. **Ricerca per messaggio di errore**: cerca nel codebase dove viene lanciato o generato quel messaggio.
   ```
   Grep per il messaggio di errore esatto
   Grep per la classe di errore custom
   ```

3. **Ricerca per contesto**: se l'errore e generico (es. `Cannot read properties of undefined`), usa il contesto:
   - Quale funzione era in esecuzione
   - Quale variabile e undefined
   - Quale operazione stava tentando

4. **Ricerca per pattern**: per errori comuni, cerca il pattern noto:
   ```
   "Cannot read properties of undefined" -> accesso a proprieta su valore nullable
   "Module not found"                    -> import path sbagliato o dipendenza mancante
   "ECONNREFUSED"                        -> servizio esterno non raggiungibile
   "ENOENT"                              -> file o directory non esistente
   ```

## Step 3: Analisi root cause

Una volta localizzato il codice, determina la causa. Categorie comuni:

| Categoria          | Esempio                                          | Fix tipica                          |
|--------------------|--------------------------------------------------|-------------------------------------|
| **Null/Undefined** | Accesso a `.map()` su valore che puo essere null | Optional chaining o guard clause    |
| **Import errato**  | Path sbagliato, estensione mancante              | Correggi il path di import          |
| **Tipo errato**    | Stringa passata dove serve numero                | Parsing o validazione input         |
| **Async/Await**    | Promise non awaited, race condition              | Aggiungi await o gestisci Promise   |
| **Config**         | Variabile env mancante, porta in uso             | Aggiungi default o validazione      |
| **Dipendenza**     | Pacchetto mancante o versione incompatibile      | Install o pin versione              |
| **State**          | Stato React non aggiornato, stale closure        | useCallback, dependency array       |
| **API**            | Risposta con struttura diversa da quella attesa  | Validazione risposta, type guard    |

## Step 4: Proposta fix

Mostra la fix proposta prima di applicarla:

```markdown
## Diagnosi

**Errore**: TypeError: Cannot read properties of undefined (reading 'map')
**File**: src/components/UserList.tsx:23
**Causa**: `users` e `undefined` al primo render perche il fetch e asincrono

## Fix proposta

```diff
- return users.map(user => <UserCard key={user.id} user={user} />);
+ if (!users) return <LoadingSpinner />;
+ return users.map(user => <UserCard key={user.id} user={user} />);
```

**Perche funziona**: aggiunge un guard clause che gestisce lo stato
di caricamento iniziale prima che i dati siano disponibili.
```

## Step 5: Applicazione fix

Applica la modifica usando lo strumento Edit. Mai sovrascrivere l'intero file: modifica solo le righe necessarie.

Regole:
- Cambia il minimo indispensabile per risolvere l'errore
- Non fare refactoring opportunistico durante una fix
- Preserva lo stile del codice esistente (indentazione, naming, pattern)
- Se la fix richiede un nuovo import, aggiungilo nella sezione import esistente
- Se la fix richiede una nuova dipendenza, installala

## Step 6: Verifica

Dopo aver applicato la fix, verifica che funzioni:

```bash
# Typecheck (se TypeScript)
npx tsc --noEmit 2>&1 | head -20

# Test relativi al file modificato
npm test -- --testPathPattern="<pattern>" 2>&1

# Lint
npx eslint <file-modificato> 2>&1
```

Se la verifica fallisce:
1. Analizza il nuovo errore
2. Correggi (massimo 3 tentativi)
3. Se dopo 3 tentativi non e risolto, mostra lo stato attuale e le opzioni

## Step 7: Output finale

```
FIX APPLICATA

Errore:   TypeError: Cannot read properties of undefined (reading 'map')
File:     src/components/UserList.tsx:23
Causa:    Accesso a `users` prima che il fetch async sia completato
Fix:      Guard clause con LoadingSpinner per stato di caricamento

Verifica:
  Typecheck  PASS
  Test       PASS (12 passed)
  Lint       PASS

Nota: se il problema si ripresenta, verifica che l'API /users
risponda entro il timeout configurato.
```

## Gestione errori

- **Errore non riproducibile**: documenta il contesto e suggerisci come riprodurlo (specifica env, dati di test, sequenza di azioni).
- **Causa in dipendenza esterna**: identifica la dipendenza, cerca issue noti nel suo repository, suggerisci workaround o pin di versione.
- **Errore in codice generato/minificato**: risali al sorgente tramite source map o struttura del progetto.
- **Errori multipli a cascata**: identifica l'errore root (di solito il primo nello stack), fixa quello e verifica se gli altri si risolvono.
- **Fix richiede modifica architetturale**: segnala che la fix veloce e un palliativo e suggerisci la soluzione corretta come follow-up.
- **File di sola lettura o in node_modules**: non modificare. Segnala la causa e suggerisci l'approccio corretto (override, patch-package, fork).
