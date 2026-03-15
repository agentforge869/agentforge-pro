---
name: type-check
description: Esegue il type checking TypeScript, parsa gli errori e applica fix automatiche per problemi di tipo comuni.
trigger: "/type-check"
---

# /type-check - Type Checking con Auto-Fix

Workflow per eseguire il type checking TypeScript, analizzare gli errori e correggere automaticamente i problemi di tipo piu comuni.

## Trigger

```
/type-check                    # check su tutto il progetto
/type-check src/auth/          # check su una directory specifica
/type-check src/api/router.ts  # check su un file specifico
```

## Step 1: Rilevamento configurazione

Cerca la configurazione TypeScript del progetto:

```bash
# Trova tsconfig
ls tsconfig*.json 2>/dev/null

# Verifica versione TypeScript installata
npx tsc --version 2>/dev/null
```

Se non esiste `tsconfig.json`, interrompi con:
> Nessun `tsconfig.json` trovato. Questo progetto non usa TypeScript o la configurazione manca.

## Step 2: Esecuzione type check

```bash
# Check completo
npx tsc --noEmit --pretty 2>&1

# Oppure su path specifico (usa --project con tsconfig piu vicino)
npx tsc --noEmit --pretty -p tsconfig.json 2>&1 | grep -A 2 "<path-specificato>"
```

Se il check passa senza errori, interrompi con:
> Type check passato. 0 errori trovati.

## Step 3: Parsing errori

Parsa ogni errore TypeScript estraendo:
- **File e riga**: dove si verifica l'errore
- **Codice errore**: TS2345, TS2322, ecc.
- **Messaggio**: descrizione dell'incompatibilita di tipo

Classifica gli errori per auto-fixability:

| Codice   | Tipo errore                            | Auto-fix                              |
|----------|----------------------------------------|---------------------------------------|
| TS2322   | Type 'X' is not assignable to 'Y'     | Aggiorna type annotation o cast       |
| TS2345   | Argument type mismatch                 | Aggiusta il tipo dell'argomento       |
| TS2532   | Object is possibly 'undefined'         | Aggiungi optional chaining o guard    |
| TS2531   | Object is possibly 'null'              | Aggiungi null check                   |
| TS7006   | Parameter implicitly has 'any' type    | Aggiungi type annotation esplicita    |
| TS2304   | Cannot find name                       | Aggiungi import mancante              |
| TS6133   | Declared but never used                | Rimuovi o prefix con underscore       |
| TS2339   | Property does not exist on type        | Estendi interface o usa type assertion |
| TS18046  | Value is of type 'unknown'             | Aggiungi type guard o assertion       |

Errori NON auto-fixabili (richiedono decisione umana):
- Incompatibilita strutturali tra interfacce complesse
- Generic constraint violations
- Overload resolution ambigua
- Errori in file di dichiarazione `.d.ts`

## Step 4: Applicazione fix

Per ogni errore auto-fixabile:
1. Leggi il file e il contesto intorno alla riga con Read
2. Determina la fix minima corretta
3. Applica la modifica con Edit
4. Registra la modifica applicata

Regole per le fix:
- Preferisci type narrowing (guard clause, `instanceof`, `in`) rispetto a type assertion (`as`)
- Preferisci optional chaining (`?.`) rispetto a null check espliciti quando il valore e opzionale per design
- MAI usare `any` come fix — usa `unknown` con type guard se il tipo non e determinabile
- MAI usare `@ts-ignore` o `@ts-expect-error` come fix
- Se l'errore e in un tipo importato da una libreria, non modificare il tipo: adatta il codice

## Step 5: Ri-verifica

Dopo aver applicato tutte le fix:

```bash
npx tsc --noEmit --pretty 2>&1
```

Se restano errori:
- Se sono auto-fixabili, ripeti Step 4 (massimo 2 iterazioni)
- Se non sono auto-fixabili, elencali nel report

## Step 6: Output finale

```
TYPE CHECK COMPLETATO

Errori trovati:     14
Auto-fix applicati: 11
Errori residui:     3 (richiedono intervento manuale)

Fix applicati:
  src/api/router.ts:23     TS2532  Aggiunto optional chaining su `user?.email`
  src/auth/login.ts:45     TS7006  Aggiunta type annotation `req: Request`
  src/utils/parse.ts:12    TS2322  Corretto return type da `string` a `string | null`
  ...

Errori residui:
  src/types/api.ts:67      TS2344  Generic constraint incompatibile (richiede revisione interfaccia)
  ...
```
