---
name: commit
description: Analizza le modifiche staged/unstaged, genera un messaggio Conventional Commits e crea il commit con co-author.
trigger: "/commit"
---

# /commit - Commit Intelligente

Workflow automatico per creare commit puliti e conformi alla specifica Conventional Commits.

## Trigger

Invoca con `/commit` oppure `/commit -m "hint opzionale"`.
Se viene passato un hint, il messaggio finale lo incorpora come contesto ma non lo copia verbatim.

## Step 1: Raccolta stato repository

Esegui in parallelo:

```bash
git status
git diff --cached --stat
git diff --cached
git log --oneline -5
```

Se non ci sono modifiche staged ne unstaged, interrompi con:
> Nessuna modifica da committare. Usa `git add` per preparare i file.

Se ci sono modifiche unstaged ma niente staged, chiedi conferma prima di fare `git add` dei file rilevanti. Non aggiungere mai file che contengono pattern sensibili (`.env`, `credentials`, `secret`, `token`, chiavi API hardcoded).

## Step 2: Analisi semantica delle modifiche

Classifica le modifiche in una di queste categorie Conventional Commits:

| Prefisso   | Quando usarlo                                      |
|------------|-----------------------------------------------------|
| `feat`     | Nuova funzionalita visibile all'utente              |
| `fix`      | Correzione di un bug                                 |
| `refactor` | Ristrutturazione senza cambi funzionali             |
| `docs`     | Solo documentazione                                  |
| `test`     | Aggiunta o modifica di test                          |
| `chore`    | Build, dipendenze, config, CI                        |
| `style`    | Formattazione, spazi, semicolons (no logica)         |
| `perf`     | Miglioramento di performance                         |
| `ci`       | Modifiche a pipeline CI/CD                           |

Se le modifiche coprono piu categorie, usa la categoria dominante. Se sono veramente miste e non separabili, usa `chore`.

## Step 3: Determinazione dello scope

Identifica lo scope dal path dei file modificati:

- `src/auth/*` -> scope `auth`
- `src/api/*` -> scope `api`
- `tests/*` -> scope `test`
- File nella root -> scope `config` o ometti lo scope
- Monorepo con packages -> usa il nome del package come scope

Lo scope e opzionale. Omettilo se le modifiche toccano troppi moduli per avere uno scope significativo.

## Step 4: Generazione messaggio

Struttura del messaggio:

```
<tipo>(<scope>): <descrizione imperativa in inglese, max 72 char>

<corpo opzionale: spiega il "perche", non il "cosa">

Co-Authored-By: Claude <noreply@anthropic.com>
```

Regole per la descrizione:
- Inizia con verbo imperativo lowercase (`add`, `fix`, `remove`, `update`)
- Massimo 72 caratteri nella prima riga
- Non terminare con punto
- Scrivi in inglese anche se il progetto ha commit in altra lingua (convenzione standard)

Il corpo e obbligatorio se:
- La modifica e un breaking change (aggiungi `BREAKING CHANGE:` nel footer)
- La logica non e ovvia dal diff
- Ci sono decisioni architetturali da documentare

## Step 5: Esecuzione commit

Crea il commit usando heredoc per preservare la formattazione:

```bash
git commit -m "$(cat <<'EOF'
feat(auth): add JWT refresh token rotation

Rotate refresh tokens on every use to limit the window of
compromise if a token is leaked. Old tokens are invalidated
immediately after rotation.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

Dopo il commit, esegui `git status` per verificare che sia andato a buon fine.

## Step 6: Output finale

Mostra un riepilogo:

```
Commit creato: <hash breve>
Tipo: feat(auth)
File: 3 modificati, 47 aggiunte, 12 rimozioni
Branch: feature/jwt-refresh
```

## Gestione errori

- **Pre-commit hook fallisce**: leggi l'output dell'hook, correggi il problema (lint, format, test), ri-esegui `git add` dei file corretti e crea un NUOVO commit (mai `--amend`).
- **Merge conflict in staged**: segnala il conflitto e non committare.
- **File binari grandi (>5MB)**: avvisa l'utente e suggerisci `.gitignore` o Git LFS.
- **Secrets rilevati**: blocca il commit e mostra esattamente quale file/riga contiene il segreto.
