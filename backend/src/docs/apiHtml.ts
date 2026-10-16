export function getApiDocumentationHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Football Federation Hub — REST API Backend</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #090d16;
      --card-bg: #111827;
      --card-border: #1f293d;
      --primary: #10b981;
      --primary-hover: #059669;
      --accent: #3b82f6;
      --accent-purple: #8b5cf6;
      --text: #f3f4f6;
      --text-muted: #9ca3af;
      --badge-get: #10b981;
      --badge-post: #3b82f6;
      --badge-put: #f59e0b;
      --badge-delete: #ef4444;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.6;
      padding: 0;
      min-height: 100vh;
    }

    .header {
      background: linear-gradient(180deg, rgba(16, 185, 129, 0.12) 0%, rgba(9, 13, 22, 0) 100%);
      border-bottom: 1px solid var(--card-border);
      padding: 40px 24px;
      text-align: center;
    }

    .badge-live {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.4);
      color: #34d399;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 0.8rem;
      font-weight: 600;
      margin-bottom: 16px;
    }

    .badge-live::before {
      content: "";
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 10px #10b981;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }

    h1 {
      font-size: 2.5rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      margin-bottom: 8px;
      background: linear-gradient(135deg, #ffffff 30%, #9ca3af 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .subtitle {
      color: var(--text-muted);
      font-size: 1.1rem;
      max-width: 650px;
      margin: 0 auto 24px;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 32px 20px;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }

    .stat-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      transition: transform 0.2s, border-color 0.2s;
    }

    .stat-card:hover {
      transform: translateY(-2px);
      border-color: rgba(16, 185, 129, 0.5);
    }

    .stat-val {
      font-size: 2rem;
      font-weight: 700;
      color: #fff;
    }

    .stat-label {
      color: var(--text-muted);
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-top: 4px;
    }

    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      padding: 24px;
      margin-bottom: 24px;
    }

    .card-title {
      font-size: 1.25rem;
      font-weight: 700;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .auth-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
      background: #0d121f;
      border: 1px solid #1e293b;
      padding: 14px 18px;
      border-radius: 10px;
      margin-bottom: 24px;
    }

    .token-input {
      flex: 1;
      min-width: 250px;
      background: #1e293b;
      border: 1px solid #334155;
      color: #fff;
      font-family: 'JetBrains Mono', monospace;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 0.85rem;
    }

    .btn {
      background: var(--primary);
      color: #fff;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 0.875rem;
      cursor: pointer;
      transition: background 0.2s;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .btn:hover { background: var(--primary-hover); }
    .btn-secondary { background: #1f2937; border: 1px solid #374151; }
    .btn-secondary:hover { background: #374151; }

    .routes-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 12px;
    }

    .route-row {
      background: #0c111d;
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }

    .route-left {
      display: flex;
      align-items: center;
      gap: 12px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.9rem;
    }

    .method-tag {
      padding: 3px 8px;
      border-radius: 4px;
      font-weight: 700;
      font-size: 0.75rem;
      letter-spacing: 0.05em;
    }

    .method-GET { background: rgba(16, 185, 129, 0.2); color: #34d399; }
    .method-POST { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
    .method-PUT { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
    .method-DELETE { background: rgba(239, 68, 68, 0.2); color: #f87171; }

    .route-desc {
      color: var(--text-muted);
      font-size: 0.85rem;
      margin-left: 10px;
      font-family: 'Plus Jakarta Sans', sans-serif;
    }

    .try-btn {
      background: #1f293d;
      border: 1px solid #374151;
      color: #93c5fd;
      padding: 5px 12px;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
    }

    .try-btn:hover { background: #3b82f6; color: #fff; }

    #live-response-box {
      margin-top: 24px;
      background: #06090e;
      border: 1px solid #1f2937;
      border-radius: 10px;
      padding: 16px;
      display: none;
    }

    pre {
      font-family: 'JetBrains Mono', monospace;
      color: #38bdf8;
      font-size: 0.8rem;
      max-height: 400px;
      overflow: auto;
      white-space: pre-wrap;
    }

    .footer {
      text-align: center;
      padding: 40px;
      color: var(--text-muted);
      font-size: 0.85rem;
      border-top: 1px solid var(--card-border);
    }
  </style>
</head>
<body>

  <header class="header">
    <div class="badge-live">ONLINE & OPERATIONAL — PORT 5001</div>
    <h1>Football Federation Hub API</h1>
    <p class="subtitle">Complete RESTful backend service for national clubs, players, leagues, match fixtures, registrations, disciplinary cases, and transfers.</p>
  </header>

  <main class="container">

    <!-- KPI Stats -->
    <div class="stats-grid" id="stats-container">
      <div class="stat-card">
        <div class="stat-val" id="kpi-clubs">6</div>
        <div class="stat-label">Active Clubs</div>
      </div>
      <div class="stat-card">
        <div class="stat-val" id="kpi-players">8</div>
        <div class="stat-label">Registered Players</div>
      </div>
      <div class="stat-card">
        <div class="stat-val" id="kpi-matches">6</div>
        <div class="stat-label">Matches & Fixtures</div>
      </div>
      <div class="stat-card">
        <div class="stat-val" id="kpi-competitions">3</div>
        <div class="stat-label">Competitions</div>
      </div>
    </div>

    <!-- Dev Token & Quick Auth -->
    <div class="card">
      <div class="card-title">🔑 Authentication & Quick Test Access</div>
      <div class="auth-bar">
        <span style="font-size:0.85rem; color:#9ca3af;">Bearer Token:</span>
        <input type="text" id="dev-token-input" class="token-input" value="dev-token" />
        <button class="btn btn-secondary" onclick="setToken('dev-token')">Use 'dev-token'</button>
        <button class="btn btn-secondary" onclick="quickLogin('admin@federation.org')">Login Admin</button>
        <button class="btn btn-secondary" onclick="quickLogin('referee@federation.org')">Login Referee</button>
        <button class="btn" onclick="resetSeedData()">Reset Seed Data</button>
      </div>
      <div style="font-size: 0.8rem; color: #9ca3af;">
        💡 <strong>Tip:</strong> You can pass <code>Authorization: Bearer dev-token</code> or add <code>?token=admin</code> to any request to bypass auth during local development!
      </div>
    </div>

    <!-- Live Response Viewer -->
    <div id="live-response-box">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <span style="font-weight:700; font-size:0.9rem;" id="response-endpoint">API Response</span>
        <button class="btn btn-secondary" style="padding:2px 8px; font-size:0.75rem;" onclick="document.getElementById('live-response-box').style.display='none'">Close</button>
      </div>
      <pre id="response-json">// Click any "Try It" button below to execute the endpoint live...</pre>
    </div>

    <!-- API Routes Directory -->
    <div class="card">
      <div class="card-title">📚 REST API Endpoints Directory</div>
      <div class="routes-grid">

        <div class="route-row">
          <div class="route-left">
            <span class="method-tag method-GET">GET</span>
            <span>/api/dashboard/stats</span>
            <span class="route-desc">— Overall federation KPIs & top scorers</span>
          </div>
          <button class="try-btn" onclick="executeCall('/api/dashboard/stats')">Try It</button>
        </div>

        <div class="route-row">
          <div class="route-left">
            <span class="method-tag method-GET">GET</span>
            <span>/api/clubs</span>
            <span class="route-desc">— List all football clubs with filters</span>
          </div>
          <button class="try-btn" onclick="executeCall('/api/clubs')">Try It</button>
        </div>

        <div class="route-row">
          <div class="route-left">
            <span class="method-tag method-GET">GET</span>
            <span>/api/players</span>
            <span class="route-desc">— List players, positions, and nationalities</span>
          </div>
          <button class="try-btn" onclick="executeCall('/api/players')">Try It</button>
        </div>

        <div class="route-row">
          <div class="route-left">
            <span class="method-tag method-GET">GET</span>
            <span>/api/competitions</span>
            <span class="route-desc">— Active leagues, cups, and tournament info</span>
          </div>
          <button class="try-btn" onclick="executeCall('/api/competitions')">Try It</button>
        </div>

        <div class="route-row">
          <div class="route-left">
            <span class="method-tag method-GET">GET</span>
            <span>/api/competitions/comp-pl/standings</span>
            <span class="route-desc">— Dynamic Premier League table standings</span>
          </div>
          <button class="try-btn" onclick="executeCall('/api/competitions/comp-pl/standings')">Try It</button>
        </div>

        <div class="route-row">
          <div class="route-left">
            <span class="method-tag method-GET">GET</span>
            <span>/api/matches</span>
            <span class="route-desc">— All fixture schedules and results</span>
          </div>
          <button class="try-btn" onclick="executeCall('/api/matches')">Try It</button>
        </div>

        <div class="route-row">
          <div class="route-left">
            <span class="method-tag method-GET">GET</span>
            <span>/api/matches/match-1</span>
            <span class="route-desc">— Derby match fixture with live events list</span>
          </div>
          <button class="try-btn" onclick="executeCall('/api/matches/match-1')">Try It</button>
        </div>

        <div class="route-row">
          <div class="route-left">
            <span class="method-tag method-GET">GET</span>
            <span>/api/registrations</span>
            <span class="route-desc">— Player license registrations & status</span>
          </div>
          <button class="try-btn" onclick="executeCall('/api/registrations')">Try It</button>
        </div>

        <div class="route-row">
          <div class="route-left">
            <span class="method-tag method-GET">GET</span>
            <span>/api/transfers</span>
            <span class="route-desc">— Inter-club player transfer requests & history</span>
          </div>
          <button class="try-btn" onclick="executeCall('/api/transfers')">Try It</button>
        </div>

        <div class="route-row">
          <div class="route-left">
            <span class="method-tag method-GET">GET</span>
            <span>/api/disciplinary</span>
            <span class="route-desc">— Red/yellow cards, fines, & match suspensions</span>
          </div>
          <button class="try-btn" onclick="executeCall('/api/disciplinary')">Try It</button>
        </div>

        <div class="route-row">
          <div class="route-left">
            <span class="method-tag method-GET">GET</span>
            <span>/api/disciplinary/accumulations</span>
            <span class="route-desc">— Yellow card threshold tracking table</span>
          </div>
          <button class="try-btn" onclick="executeCall('/api/disciplinary/accumulations')">Try It</button>
        </div>

        <div class="route-row">
          <div class="route-left">
            <span class="method-tag method-GET">GET</span>
            <span>/api/documents</span>
            <span class="route-desc">— Player passports, medical certificates, licenses</span>
          </div>
          <button class="try-btn" onclick="executeCall('/api/documents')">Try It</button>
        </div>

        <div class="route-row">
          <div class="route-left">
            <span class="method-tag method-GET">GET</span>
            <span>/api/audit</span>
            <span class="route-desc">— Federation administrative audit log</span>
          </div>
          <button class="try-btn" onclick="executeCall('/api/audit')">Try It</button>
        </div>

        <div class="route-row">
          <div class="route-left">
            <span class="method-tag method-GET">GET</span>
            <span>/api/auth/demo-accounts</span>
            <span class="route-desc">— List pre-seeded accounts for each RBAC role</span>
          </div>
          <button class="try-btn" onclick="executeCall('/api/auth/demo-accounts')">Try It</button>
        </div>

      </div>
    </div>

  </main>

  <footer class="footer">
    Football Federation Hub API &bull; Built with Node.js, Express & TypeScript &bull; Ready for Frontend & REST integrations
  </footer>

  <script>
    function setToken(token) {
      document.getElementById('dev-token-input').value = token;
    }

    async function quickLogin(email) {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: 'password123' })
        });
        const data = await res.json();
        if (data.token) {
          setToken(data.token);
          alert('Logged in as ' + data.user.name + ' (' + data.user.role + ')! Token set.');
        } else {
          alert('Login error: ' + JSON.stringify(data));
        }
      } catch (err) {
        alert('Login failed: ' + err.message);
      }
    }

    async function executeCall(endpoint) {
      const box = document.getElementById('live-response-box');
      const title = document.getElementById('response-endpoint');
      const pre = document.getElementById('response-json');
      const token = document.getElementById('dev-token-input').value;

      box.style.display = 'block';
      title.innerText = 'Calling ' + endpoint + '...';
      pre.innerText = 'Fetching...';

      try {
        const headers = {};
        if (token) headers['Authorization'] = 'Bearer ' + token;

        const res = await fetch(endpoint, { headers });
        const data = await res.json();
        title.innerText = endpoint + ' [Status: ' + res.status + ']';
        pre.innerText = JSON.stringify(data, null, 2);
      } catch (err) {
        title.innerText = endpoint + ' [Error]';
        pre.innerText = err.message;
      }
    }

    async function resetSeedData() {
      if (!confirm('Reset database to clean seed state?')) return;
      try {
        const res = await fetch('/api/system/reset-seed', { method: 'POST' });
        const data = await res.json();
        alert('Database reset to fresh seed state!');
        location.reload();
      } catch (err) {
        alert('Failed: ' + err.message);
      }
    }

    // Load initial stats
    fetch('/api/dashboard/stats')
      .then(r => r.json())
      .then(d => {
        if (d.kpis) {
          document.getElementById('kpi-clubs').innerText = d.kpis.activeClubs || 6;
          document.getElementById('kpi-players').innerText = d.kpis.activePlayers || 8;
          document.getElementById('kpi-matches').innerText = d.kpis.totalMatches || 6;
          document.getElementById('kpi-competitions').innerText = d.kpis.activeCompetitions || 3;
        }
      })
      .catch(() => {});
  </script>
</body>
</html>`;
}
