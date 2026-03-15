const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');
const { exec } = require('child_process');

const app = express();
const PORT = 7788;
const DB_PATH = path.join(__dirname, 'business.db');

app.use(express.json());

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    service TEXT NOT NULL,
    email TEXT,
    username TEXT,
    password TEXT,
    status TEXT DEFAULT 'pending',
    url TEXT,
    notes TEXT,
    signup_url TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price REAL,
    file_path TEXT,
    file_size TEXT,
    status TEXT DEFAULT 'draft',
    payhip_url TEXT,
    downloads INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS finances (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'EUR',
    description TEXT,
    source TEXT,
    date TEXT DEFAULT (date('now')),
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS timeline (
    id TEXT PRIMARY KEY,
    phase TEXT NOT NULL,
    action TEXT NOT NULL,
    result TEXT,
    status TEXT DEFAULT 'done',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS assets (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    location TEXT,
    value TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// Add signup_url column if missing
try { db.exec("ALTER TABLE accounts ADD COLUMN signup_url TEXT"); } catch(e) {}

// Update accounts with signup URLs and Italian notes
const updateAcc = db.prepare("UPDATE accounts SET signup_url=?, notes=? WHERE id=?");
try {
  updateAcc.run('https://proton.me/mail', 'Email principale - crittografata e anonima (svizzera)', 'acc-proton');
  updateAcc.run('https://github.com/signup', 'Dove pubblichiamo il codice gratis per attirare clienti', 'acc-github');
  updateAcc.run('https://dash.cloudflare.com/sign-up', 'Dove mettiamo il sito web online gratis', 'acc-cloudflare');
  updateAcc.run('https://payhip.com/auth/register', 'Dove vendiamo i prodotti e riceviamo i pagamenti', 'acc-payhip');
} catch(e) {}

// API Routes
app.get('/api/summary', (req, res) => {
  const accounts = db.prepare('SELECT * FROM accounts').all();
  const products = db.prepare('SELECT * FROM products').all();
  const revenue = db.prepare("SELECT COALESCE(SUM(amount),0) as total FROM finances WHERE type='revenue'").get().total;
  const expenses = db.prepare("SELECT COALESCE(SUM(amount),0) as total FROM finances WHERE type='expense'").get().total;
  const timeline = db.prepare('SELECT * FROM timeline ORDER BY created_at DESC').all();
  const assets = db.prepare('SELECT * FROM assets').all();
  res.json({ accounts, products, revenue, expenses, profit: revenue - expenses, timeline, assets });
});

app.get('/api/accounts', (req, res) => res.json(db.prepare('SELECT * FROM accounts').all()));
app.get('/api/products', (req, res) => res.json(db.prepare('SELECT * FROM products').all()));
app.get('/api/finances', (req, res) => res.json(db.prepare('SELECT * FROM finances ORDER BY date DESC').all()));
app.get('/api/timeline', (req, res) => res.json(db.prepare('SELECT * FROM timeline ORDER BY created_at DESC').all()));
app.get('/api/assets', (req, res) => res.json(db.prepare('SELECT * FROM assets').all()));

app.post('/api/accounts/:id', (req, res) => {
  const { status, notes } = req.body;
  db.prepare("UPDATE accounts SET status=COALESCE(?,status), notes=COALESCE(?,notes), updated_at=datetime('now') WHERE id=?").run(status, notes, req.params.id);
  res.json({ ok: true });
});

app.post('/api/finances', (req, res) => {
  const { type, amount, description, source } = req.body;
  const id = 'fin-' + crypto.randomUUID().slice(0, 8);
  db.prepare('INSERT INTO finances (id, type, amount, description, source) VALUES (?, ?, ?, ?, ?)').run(id, type, amount, description, source);
  res.json({ ok: true, id });
});

app.post('/api/timeline', (req, res) => {
  const { phase, action, result, status } = req.body;
  const id = 't-' + crypto.randomUUID().slice(0, 8);
  db.prepare('INSERT INTO timeline (id, phase, action, result, status) VALUES (?, ?, ?, ?, ?)').run(id, phase, action, result, status || 'done');
  res.json({ ok: true, id });
});

// Browser assist endpoint - opens browser to signup page with auto-fill
app.post('/api/browser-assist/:id', (req, res) => {
  const account = db.prepare('SELECT * FROM accounts WHERE id=?').get(req.params.id);
  if (!account) return res.status(404).json({ error: 'Account non trovato' });

  const url = account.signup_url || account.url;
  // Launch default browser to the signup URL
  const cmd = process.platform === 'win32' ? `start "" "${url}"` : `xdg-open "${url}"`;
  exec(cmd, (err) => {
    if (err) return res.json({ ok: false, error: err.message });
    res.json({ ok: true, message: `Browser aperto su ${url}` });
  });
});

// Dashboard HTML - TUTTO IN ITALIANO
app.get('/', (req, res) => {
  res.type('html').send(`<!DOCTYPE html>
<html lang="it"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>AgentForge - Pannello Azienda</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;background:#0a0a0a;color:#e5e5e5;padding:20px}
h1{font-size:1.6em;margin-bottom:8px;color:#3b82f6}
.sub{color:#737373;margin-bottom:24px;font-size:.9em}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin:16px 0}
.card{background:#141414;border:1px solid #262626;border-radius:10px;padding:16px}
.card .label{color:#737373;font-size:.75em;text-transform:uppercase;letter-spacing:.5px}
.card .val{font-size:2em;font-weight:800;margin-top:4px}
.green{color:#22c55e}.red{color:#ef4444}.blue{color:#3b82f6}.yellow{color:#eab308}.purple{color:#a855f7}.orange{color:#f97316}
h2{color:#3b82f6;font-size:1.1em;margin:28px 0 12px;border-bottom:1px solid #262626;padding-bottom:6px}
table{width:100%;border-collapse:collapse;font-size:.85em}
th{text-align:left;color:#737373;font-size:.75em;text-transform:uppercase;padding:8px 10px;border-bottom:1px solid #262626}
td{padding:8px 10px;border-bottom:1px solid #1a1a1a;vertical-align:top}
.status{display:inline-block;padding:2px 10px;border-radius:99px;font-size:.8em;font-weight:600}
.status-done,.status-ready,.status-active,.status-built,.status-creato{background:#052e16;color:#22c55e;border:1px solid #166534}
.status-pending,.status-in_progress,.status-in_attesa,.status-captcha_pending{background:#1c1917;color:#eab308;border:1px solid #854d0e}
.status-blocked,.status-bloccato{background:#1c0a0a;color:#ef4444;border:1px solid #991b1b}
.status-draft,.status-bozza{background:#0a0a1c;color:#818cf8;border:1px solid #4338ca}
.pw{font-family:'SF Mono',monospace;font-size:.8em;color:#525252;cursor:pointer;background:#1a1a1a;padding:3px 10px;border-radius:4px;border:1px solid #262626;display:inline-block}
.pw:hover{color:#e5e5e5;border-color:#3b82f6}
.tabs{display:flex;gap:8px;margin:20px 0;flex-wrap:wrap}
.tab{padding:8px 18px;background:#141414;border:1px solid #262626;border-radius:8px;cursor:pointer;font-size:.85em;color:#737373;transition:all .2s;user-select:none}
.tab:hover,.tab.active{background:#1e3a5f;color:#3b82f6;border-color:#3b82f6}
.section{display:none}.section.active{display:block}
.btn{padding:6px 14px;border-radius:6px;cursor:pointer;font-size:.8em;font-weight:600;border:1px solid;transition:all .2s;display:inline-flex;align-items:center;gap:6px}
.btn:active{transform:scale(0.95)}
.btn-blue{background:#1e3a5f;color:#3b82f6;border-color:#2563eb}
.btn-blue:hover{background:#2563eb;color:#fff}
.btn-green{background:#052e16;color:#22c55e;border-color:#166534}
.btn-green:hover{background:#166534;color:#fff}
.btn-orange{background:#431407;color:#f97316;border-color:#9a3412}
.btn-orange:hover{background:#9a3412;color:#fff}
.btn-red{background:#1c0a0a;color:#ef4444;border-color:#991b1b}
.btn-red:hover{background:#991b1b;color:#fff}
.refresh{float:right;padding:6px 16px;background:#1e3a5f;color:#3b82f6;border:1px solid #2563eb;border-radius:6px;cursor:pointer;font-size:.85em}
.refresh:hover{background:#2563eb;color:#fff}
.timeline-item{display:flex;gap:12px;padding:10px 0;border-bottom:1px solid #1a1a1a}
.timeline-dot{width:10px;height:10px;border-radius:50%;margin-top:5px;flex-shrink:0}
.timeline-dot.done{background:#22c55e}.timeline-dot.in_progress{background:#eab308}.timeline-dot.blocked{background:#ef4444}
.toast{position:fixed;bottom:20px;right:20px;background:#166534;color:#22c55e;padding:12px 20px;border-radius:8px;border:1px solid #22c55e;font-size:.9em;display:none;z-index:999;animation:fadeIn .3s}
@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.help-box{background:#141414;border:1px solid #262626;border-radius:10px;padding:16px;margin:16px 0;font-size:.9em;line-height:1.6}
.help-box strong{color:#3b82f6}
.acc-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}
</style>
</head><body>
<button class="refresh" onclick="load()">Aggiorna</button>
<h1>AgentForge - Pannello Azienda</h1>
<p class="sub">Tutto quello che serve per l'azienda, in tempo reale</p>

<div id="summary-cards" class="grid"></div>

<div class="tabs">
  <div class="tab active" data-tab="accounts">Account</div>
  <div class="tab" data-tab="products">Prodotti</div>
  <div class="tab" data-tab="finances">Soldi</div>
  <div class="tab" data-tab="assets">Cose Nostre</div>
  <div class="tab" data-tab="timeline">Cosa e Successo</div>
  <div class="tab" data-tab="help">Come Funziona</div>
</div>

<div id="accounts" class="section active"></div>
<div id="products" class="section"></div>
<div id="finances" class="section"></div>
<div id="assets" class="section"></div>
<div id="timeline" class="section"></div>
<div id="help" class="section"></div>

<div id="toast" class="toast"></div>

<script>
let data = {};

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', function() {
    const id = this.dataset.tab;
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    this.classList.add('active');
  });
});

function toast(msg, color) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.background = color === 'red' ? '#1c0a0a' : '#052e16';
  t.style.color = color === 'red' ? '#ef4444' : '#22c55e';
  t.style.borderColor = color === 'red' ? '#ef4444' : '#22c55e';
  t.style.display = 'block';
  setTimeout(() => t.style.display = 'none', 3000);
}

async function openBrowser(accId) {
  toast('Apro il browser...', 'green');
  const r = await fetch('/api/browser-assist/' + accId, { method: 'POST' });
  const d = await r.json();
  if (d.ok) toast('Browser aperto! Completa la registrazione.', 'green');
  else toast('Errore: ' + d.error, 'red');
}

function statusIT(s) {
  const map = {
    'pending': 'Da fare',
    'active': 'Attivo',
    'done': 'Fatto',
    'built': 'Costruito',
    'ready': 'Pronto',
    'in_progress': 'In corso',
    'blocked': 'Bloccato',
    'draft': 'Bozza',
    'captcha_pending': 'Verifica manuale'
  };
  return map[s] || s;
}

function phaseIT(p) {
  const map = {
    'RESEARCH': 'RICERCA',
    'BUILD': 'COSTRUZIONE',
    'DEPLOY': 'MESSA ONLINE',
    'LAUNCH': 'LANCIO',
    'MONITOR': 'CONTROLLO'
  };
  return map[p] || p;
}

function categoryIT(c) {
  const map = {
    'code': 'Codice',
    'web': 'Sito Web',
    'product': 'Prodotto',
    'script': 'Automazione',
    'marketing': 'Marketing'
  };
  return map[c] || c;
}

async function load() {
  try {
    const r = await fetch('/api/summary');
    data = await r.json();
    render();
  } catch(e) {
    toast('Errore nel caricare i dati', 'red');
  }
}

function render() {
  const d = data;
  const readyAccounts = d.accounts.filter(a => a.status === 'active').length;
  const totalAccounts = d.accounts.length;
  const blockedAccounts = d.accounts.filter(a => ['pending','captcha_pending','blocked'].includes(a.status)).length;

  document.getElementById('summary-cards').innerHTML = \`
    <div class="card"><div class="label">Fase attuale</div><div class="val blue">MESSA ONLINE</div></div>
    <div class="card"><div class="label">Guadagni</div><div class="val green">&euro;\${d.revenue.toFixed(2)}</div></div>
    <div class="card"><div class="label">Spese</div><div class="val yellow">&euro;\${d.expenses.toFixed(2)}</div></div>
    <div class="card"><div class="label">Profitto</div><div class="val \${d.profit>=0?'green':'red'}">&euro;\${d.profit.toFixed(2)}</div></div>
    <div class="card"><div class="label">Prodotti pronti</div><div class="val purple">\${d.products.filter(p=>p.status==='built').length}</div></div>
    <div class="card"><div class="label">Account attivi</div><div class="val \${readyAccounts===totalAccounts?'green':'yellow'}">\${readyAccounts}/\${totalAccounts}</div></div>
    <div class="card"><div class="label">Da completare</div><div class="val \${blockedAccounts>0?'orange':'green'}">\${blockedAccounts}</div></div>
    <div class="card"><div class="label">Azioni fatte</div><div class="val blue">\${d.timeline.length}</div></div>
  \`;

  // ACCOUNTS
  document.getElementById('accounts').innerHTML = '<h2>Account e Password</h2>' +
    '<p style="color:#737373;margin-bottom:12px;font-size:.85em">Qui trovi tutti gli account creati per l\\'azienda. Clicca "Mostra password" per vedere la password. Se un account e bloccato, clicca "Apri nel browser" e completa tu la registrazione.</p>' +
    '<table><tr><th>Servizio</th><th>Email / Utente</th><th>Password</th><th>Stato</th><th>A cosa serve</th><th>Azioni</th></tr>' +
    d.accounts.map(a => {
      const pwId = 'pw-' + a.id;
      const needsAction = ['pending','captcha_pending','blocked'].includes(a.status);
      return \`<tr>
        <td><strong style="font-size:1.1em">\${a.service}</strong></td>
        <td>\${a.email ? '<div>'+a.email+'</div>' : ''}\${a.username ? '<div style="color:#737373;font-size:.85em">utente: '+a.username+'</div>' : ''}</td>
        <td><span id="\${pwId}" class="pw" onclick="this.textContent='\${a.password||'nessuna'}'">\${a.password ? 'Mostra password' : '-'}</span></td>
        <td><span class="status status-\${a.status}">\${statusIT(a.status)}</span></td>
        <td style="color:#a3a3a3;font-size:.85em;max-width:200px">\${a.notes||''}</td>
        <td>
          <div class="acc-actions">
            \${needsAction ? '<button class="btn btn-orange" onclick="openBrowser(\\''+a.id+'\\')">Apri nel browser</button>' : '<span style="color:#22c55e;font-size:.85em">Tutto ok</span>'}
          </div>
        </td>
      </tr>\`;
    }).join('') + '</table>';

  // PRODUCTS
  document.getElementById('products').innerHTML = '<h2>Prodotti in Vendita</h2>' +
    '<p style="color:#737373;margin-bottom:12px;font-size:.85em">I prodotti che abbiamo costruito. Quando gli account saranno pronti, li metteremo online per la vendita.</p>' +
    '<table><tr><th>Nome</th><th>Prezzo</th><th>File</th><th>Dimensione</th><th>Stato</th></tr>' +
    d.products.map(p => \`<tr>
      <td><strong>\${p.name}</strong><br><span style="color:#737373;font-size:.8em">\${p.description||''}</span></td>
      <td class="\${p.price > 0 ? 'green' : 'blue'}" style="font-size:1.2em;font-weight:700">\${p.price > 0 ? '\u20AC'+p.price : 'GRATIS'}</td>
      <td style="font-family:monospace;font-size:.8em">\${p.file_path}</td>
      <td>\${p.file_size}</td>
      <td><span class="status status-\${p.status}">\${statusIT(p.status)}</span></td>
    </tr>\`).join('') + '</table>';

  // FINANCES
  document.getElementById('finances').innerHTML = '<h2>Soldi - Entrate e Uscite</h2>' +
    (d.finances && d.finances.length > 0 ?
    '<table><tr><th>Data</th><th>Tipo</th><th>Importo</th><th>Descrizione</th><th>Da dove</th></tr>' +
    d.finances.map(f => \`<tr>
      <td>\${f.date}</td>
      <td>\${f.type==='revenue'?'Entrata':'Uscita'}</td>
      <td class="\${f.type==='revenue'?'green':'yellow'}" style="font-weight:700">&euro;\${f.amount.toFixed(2)}</td>
      <td>\${f.description||''}</td>
      <td>\${f.source||''}</td>
    </tr>\`).join('') + '</table>'
    : '<div style="text-align:center;padding:40px;color:#737373"><p style="font-size:1.5em;margin-bottom:8px">Nessuna transazione</p><p>Quando inizieremo a vendere, i guadagni appariranno qui.</p></div>');

  // ASSETS
  document.getElementById('assets').innerHTML = '<h2>Cose Nostre - Tutto Quello Che Abbiamo</h2>' +
    '<p style="color:#737373;margin-bottom:12px;font-size:.85em">Tutto il materiale che abbiamo costruito per l\\'azienda: codice, sito web, prodotti, automazioni.</p>' +
    '<table><tr><th>Tipo</th><th>Nome</th><th>Descrizione</th><th>Dove si trova</th><th>Stato</th></tr>' +
    d.assets.map(a => \`<tr>
      <td>\${categoryIT(a.category)}</td>
      <td><strong>\${a.name}</strong></td>
      <td style="color:#a3a3a3;font-size:.85em">\${a.description||''}</td>
      <td style="font-family:monospace;font-size:.75em;color:#737373">\${a.location||''}</td>
      <td><span class="status status-\${a.status}">\${statusIT(a.status)}</span></td>
    </tr>\`).join('') + '</table>';

  // TIMELINE
  document.getElementById('timeline').innerHTML = '<h2>Cosa e Successo - Tutte le Azioni</h2>' +
    d.timeline.map(t => \`<div class="timeline-item">
      <div class="timeline-dot \${t.status}"></div>
      <div style="flex:1">
        <strong>\${phaseIT(t.phase)}</strong> — \${t.action}
        <br><span style="color:#a3a3a3;font-size:.85em">\${t.result||''}</span>
        <span class="status status-\${t.status}" style="margin-left:8px">\${statusIT(t.status)}</span>
      </div>
    </div>\`).join('');

  // HELP
  document.getElementById('help').innerHTML = \`
    <h2>Come Funziona Tutto</h2>
    <div class="help-box">
      <p><strong>Cosa stiamo facendo?</strong></p>
      <p>Stiamo costruendo un'azienda online che vende configurazioni per assistenti AI (Claude Code, Cursor). Il prodotto si chiama "AgentForge Pro".</p>
      <br>
      <p><strong>Come guadagniamo?</strong></p>
      <p>Diamo una versione gratuita su GitHub (per attirare gente), e vendiamo la versione completa su Payhip a 49\u20AC e 79\u20AC.</p>
      <br>
      <p><strong>A che punto siamo?</strong></p>
      <p>I prodotti sono <span class="green">pronti</span>. Mancano gli account per andare online. Serve:</p>
      <ul style="margin:8px 0 8px 20px;color:#a3a3a3">
        <li><strong>ProtonMail</strong> - email per registrarsi ovunque</li>
        <li><strong>GitHub</strong> - dove pubblichiamo il codice gratis</li>
        <li><strong>Cloudflare</strong> - dove mettiamo il sito web</li>
        <li><strong>Payhip</strong> - dove vendiamo i prodotti</li>
      </ul>
      <br>
      <p><strong>Cosa devo fare io?</strong></p>
      <p>Se un account ha il bottone arancione "Apri nel browser", cliccalo. Ti si apre la pagina di registrazione. Completa la verifica (tipo CAPTCHA), e il resto lo fa l'agente automatico.</p>
      <br>
      <p><strong>Dove sono i file?</strong></p>
      <ul style="margin:8px 0 8px 20px;color:#a3a3a3">
        <li>Progetto: <code style="color:#3b82f6">C:\\Users\\x\\projects\\agentforge-pro</code></li>
        <li>Prodotti zip: <code style="color:#3b82f6">dist/</code></li>
        <li>Sito web: <code style="color:#3b82f6">landing-page/</code></li>
        <li>Codice gratis: <code style="color:#3b82f6">free/</code></li>
        <li>Codice a pagamento: <code style="color:#3b82f6">premium/</code></li>
      </ul>
    </div>
  \`;
}

load();
setInterval(load, 15000);
</script>
</body></html>`);
});

app.listen(PORT, () => {
  console.log(`\x1b[36m[DASHBOARD]\x1b[0m http://localhost:${PORT}`);
});
