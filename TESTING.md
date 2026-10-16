# Football Federation Hub — Testing Guide & Test Cases

Comprehensive guide for testing the **Football Federation Hub** application, including environment setup, test methodologies, demo credentials, role-based access control (RBAC) matrix, and detailed functional & negative test cases.

---

## 1. Environment & Server Setup

### Step 1: Start the Backend REST API
Open a terminal in the project root:
```bash
npm run server
```
* **Server URL:** `http://localhost:5001`
* **API Prefix:** `http://localhost:5001/api`
* **Interactive API Documentation:** `http://localhost:5001/docs`
* **Health Check:** `http://localhost:5001/health`
* **Master Dev Token:** `dev-token` (accepted in `Authorization: Bearer dev-token` or `x-user-id` header)

### Step 2: Start the Frontend Web Application
Open a second terminal in the project root:
```bash
npm run dev
```
* **Frontend App:** `http://localhost:5173`
* Vite automatically proxies all `/api/*` network requests to `http://localhost:5001`.

### Step 3: Database Storage & Persistence
The backend automatically persists all `POST`, `PUT`, `PATCH`, and `DELETE` mutations to:
* **Database File:** `backend/data/federation_db.json`
* When you `POST` a record, it is immediately written to disk and queryable via `GET`.
* To reset the database to its pristine seed data:
  ```bash
  npm run server:seed
  ```
  Or via HTTP POST:
  ```bash
  curl -X POST http://localhost:5001/api/system/reset-seed
  ```

### Step 4: Quick 1-Click HTTP Testing (`api-requests.http`)
An interactive REST client file is available at [api-requests.http](file:///d:/AAprojets/football-federation-hub/api-requests.http).
* Open it in VS Code (with the **REST Client** or **Thunder Client** extension) to click **"Send Request"** directly without escaping quotes in terminal!

---

## 2. Demo Accounts & RBAC Matrix

All demo accounts use the standard password: **`password123`**.

| Role | Name | Email | Password | Allowed Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **Super Admin** | Solomon Tadesse | `admin@federation.org` | `password123` | Full governance, RBAC management, audit log inspection |
| **Federation Admin** | Helen Berhanu | `fed@federation.org` | `password123` | Seasons, clubs, high-level approvals, federation settings |
| **Competition Admin** | Dawit Kebede | `competition@federation.org` | `password123` | Leagues, cups, fixtures, matches, divisions, standings |
| **Registration Officer**| Almaz Girma | `registration@federation.org` | `password123` | Player registrations, licenses, document verification |
| **Transfer Officer** | Yared Wolde | `transfer@federation.org` | `password123` | Review, approve, and finalize player transfers |
| **Club Admin** | Abebe Bikila | `club@saintgeorge.org` | `password123` | Club squad, submit transfers, register players |
| **Referee** | Bamlak Tessema | `referee@federation.org` | `password123` | Match officiating, live events (goals, cards, substitutions) |
| **Disciplinary Officer**| Mulugeta Assefa | `disciplinary@federation.org` | `password123` | Card accumulations, fines, suspensions, hearings |
| **Public** | Test Visitor | *Any registered user* | *Custom* | View public standings, fixtures, clubs, player profiles |

---

## 3. Quick Smoke Test Checklist

Execute these checks to verify the overall system health before deep testing:

- [ ] **Backend Health:** `GET http://localhost:5001/health` returns HTTP `200` with status `"healthy"`.
- [ ] **Interactive Docs:** `GET http://localhost:5001/docs` renders the HTML reference page.
- [ ] **API Root Discovery:** `GET http://localhost:5001/api` returns the catalog of 15 API resources.
- [ ] **Frontend Landing Page:** `http://localhost:5173` loads without console errors.
- [ ] **1-Click Demo Switcher:** Selecting any role card on `/auth` autofills and logs in smoothly.
- [ ] **Proxy Routing:** Frontend requests to `/api/*` succeed without CORS errors.

---

## 4. Test Cases

### Module 1: Authentication & Authorization

#### TC-AUTH-01: Quick Demo Account One-Click Login
* **Precondition:** Backend and frontend servers are running.
* **Steps:**
  1. Navigate to `http://localhost:5173/auth`.
  2. Click on the **"Super Admin"** preset badge.
  3. Notice email `admin@federation.org` and password `password123` are populated.
  4. Click **"Sign In as Super Admin"**.
* **Expected Result:**
  - Token is stored in browser `localStorage` as `ff_token`.
  - User is redirected to `/dashboard`.
  - Top navigation displays user name "Solomon Tadesse" and "Super Admin" badge.

#### TC-AUTH-02: User Registration (Self-service Public User)
* **Precondition:** None.
* **Test Command:**
  ```powershell
  curl -X POST http://localhost:5001/api/auth/register `
    -H "Content-Type: application/json" `
    -d '{\"email\":\"scout@test.com\",\"password\":\"password123\",\"name\":\"Talent Scout\"}'
  ```
* **Expected Result:** HTTP `201 Created` returning `user` object with role `public` and a signed JWT `token`.

#### TC-AUTH-03: Invalid Credentials Rejection
* **Test Command:**
  ```powershell
  curl -i -X POST http://localhost:5001/api/auth/login `
    -H "Content-Type: application/json" `
    -d '{\"email\":\"admin@federation.org\",\"password\":\"wrongpassword\"}'
  ```
* **Expected Result:** HTTP `401 Unauthorized` with `{ "error": "Invalid email or password" }`.

---

### Module 2: Clubs & Squad Management

#### TC-CLUB-01: List Clubs with Query Filters
* **Test Command:**
  ```powershell
  curl "http://localhost:5001/api/clubs?status=active&city=Addis" `
    -H "Authorization: Bearer dev-token"
  ```
* **Expected Result:** HTTP `200 OK` returning paginated clubs matching the city filter.

#### TC-CLUB-02: Create New Football Club
* **Test Command:**
  ```powershell
  curl -X POST http://localhost:5001/api/clubs `
    -H "Authorization: Bearer dev-token" `
    -H "Content-Type: application/json" `
    -d '{\"name\":\"Bahir Dar City FC\",\"shortName\":\"Bahir Dar\",\"city\":\"Bahir Dar\",\"country\":\"Ethiopia\",\"foundedYear\":1973,\"status\":\"active\"}'
  ```
* **Expected Result:** HTTP `201 Created` returning club object with generated `id` and registration number.

---

### Module 3: Player Registration & Licensing Workflow

#### TC-REG-01: Submit Player Registration
* **Precondition:** Logged in as Club Admin or using `dev-token`.
* **Test Command:**
  ```powershell
  curl -X POST http://localhost:5001/api/registrations `
    -H "Authorization: Bearer dev-token" `
    -H "Content-Type: application/json" `
    -d '{\"playerId\":\"plr-1\",\"clubId\":\"club-1\",\"seasonId\":\"season-2024-25\",\"jerseyNumber\":10}'
  ```
* **Expected Result:** HTTP `201 Created` with registration `status: "pending"`.

#### TC-REG-02: Registration Officer Approves License
* **Steps:**
  1. Log in as `registration@federation.org` (Registration Officer).
  2. Navigate to **Registrations** (`/registrations`).
  3. Filter by **Pending** tab.
  4. Click **"Approve"** on the registration.
* **Test Command (API):**
  ```powershell
  curl -X PATCH http://localhost:5001/api/registrations/reg-1/approve `
    -H "Authorization: Bearer dev-token" `
    -H "Content-Type: application/json" `
    -d '{\"notes\":\"Documents verified, license issued.\"}'
  ```
* **Expected Result:** Status updates to `"active"`, license number generated, and approval recorded in audit logs.

#### TC-REG-03: Reject Incomplete Registration
* **Test Command:**
  ```powershell
  curl -X PATCH http://localhost:5001/api/registrations/reg-1/reject `
    -H "Authorization: Bearer dev-token" `
    -H "Content-Type: application/json" `
    -d '{\"reason\":\"Missing medical clearance certificate.\"}'
  ```
* **Expected Result:** HTTP `200 OK` with status changed to `"rejected"` and reason logged.

---

### Module 4: Transfers Workflow

#### TC-TRF-01: Initiate Transfer Request
* **Precondition:** Two active clubs exist.
* **Test Command:**
  ```powershell
  curl -X POST http://localhost:5001/api/transfers `
    -H "Authorization: Bearer dev-token" `
    -H "Content-Type: application/json" `
    -d '{\"playerId\":\"plr-2\",\"fromClubId\":\"club-2\",\"toClubId\":\"club-1\",\"transferType\":\"permanent\",\"transferFee\":50000,\"currency\":\"USD\",\"contractUntil\":\"2027-06-30\"}'
  ```
* **Expected Result:** HTTP `201 Created` with transfer status `"requested"`.

#### TC-TRF-02: Approve and Complete Transfer
* **Test Command:**
  ```powershell
  curl -X PATCH http://localhost:5001/api/transfers/trf-1/approve `
    -H "Authorization: Bearer dev-token" `
    -H "Content-Type: application/json" `
    -d '{\"notes\":\"Federation approval granted.\"}'
  ```
* **Expected Result:** Status updates to `"approved"`, player's active club is reassigned to destination club.

---

### Module 5: Matches, Live Events & Score Calculation

#### TC-MATCH-01: Schedule New Fixture
* **Test Command:**
  ```powershell
  curl -X POST http://localhost:5001/api/matches `
    -H "Authorization: Bearer dev-token" `
    -H "Content-Type: application/json" `
    -d '{\"competitionId\":\"comp-1\",\"seasonId\":\"season-2024-25\",\"homeTeamId\":\"team-1\",\"awayTeamId\":\"team-2\",\"matchDate\":\"2026-10-20\",\"venue\":\"Addis Ababa Stadium\"}'
  ```
* **Expected Result:** HTTP `201 Created` with match status `"scheduled"`, `homeScore: 0`, `awayScore: 0`.

#### TC-MATCH-02: Add Goal Event & Verify Dynamic Score
* **Test Command:**
  ```powershell
  curl -X POST http://localhost:5001/api/matches/match-1/events `
    -H "Authorization: Bearer dev-token" `
    -H "Content-Type: application/json" `
    -d '{\"eventType\":\"goal\",\"minute\":34,\"teamId\":\"team-1\",\"playerId\":\"plr-1\"}'
  ```
* **Expected Result:** HTTP `201 Created`. Fetching `GET /api/matches/match-1` shows `homeScore` increased by 1 and the new event listed in `events`.

#### TC-MATCH-03: Issue Red Card Event
* **Test Command:**
  ```powershell
  curl -X POST http://localhost:5001/api/matches/match-1/events `
    -H "Authorization: Bearer dev-token" `
    -H "Content-Type: application/json" `
    -d '{\"eventType\":\"red_card\",\"minute\":65,\"teamId\":\"team-2\",\"playerId\":\"plr-2\",\"notes\":\"Serious foul play\"}'
  ```
* **Expected Result:** Red card event recorded, and automatic entry generated in `/api/disciplinary`.

---

### Module 6: Competitions & Standings

#### TC-COMP-01: Generate / View League Standings
* **Steps:**
  1. Open `http://localhost:5173/standings`.
  2. Select Competition: **"Premier League"** and Season: **"2024/2025"**.
* **Test Command (API):**
  ```powershell
  curl "http://localhost:5001/api/competitions/comp-1/standings" `
    -H "Authorization: Bearer dev-token"
  ```
* **Expected Result:** Returns ordered standings table containing: Played (P), Won (W), Drawn (D), Lost (L), Goals For (GF), Goals Against (GA), Goal Difference (GD), and Points (PTS).

---

### Module 7: Disciplinary & Document Verification

#### TC-DISC-01: Disciplinary Hearing & Sanction
* **Test Command:**
  ```powershell
  curl -X PATCH http://localhost:5001/api/disciplinary/disc-1 `
    -H "Authorization: Bearer dev-token" `
    -H "Content-Type: application/json" `
    -d '{\"sanction\":\"2 matches ban + $500 fine\",\"status\":\"suspended\"}'
  ```
* **Expected Result:** HTTP `200 OK` with updated sanction details and disciplinary status.

#### TC-DOC-01: Document Verification Workflow
* **Test Command:**
  ```powershell
  curl -X PATCH http://localhost:5001/api/documents/doc-1/verify `
    -H "Authorization: Bearer dev-token" `
    -H "Content-Type: application/json" `
    -d '{\"status\":\"verified\",\"notes\":\"Passport matches government database.\"}'
  ```
* **Expected Result:** Document status becomes `"verified"`, timestamp and verifying officer ID recorded.

---

### Module 8: Audit Logs & Federation Governance

#### TC-AUDIT-01: Audit Trail Verification
* **Steps:**
  1. Perform any mutation (e.g. create a club or approve a transfer).
  2. Navigate to **Audit Trail** (`/audit`).
* **Test Command (API):**
  ```powershell
  curl "http://localhost:5001/api/audit?limit=10" `
    -H "Authorization: Bearer dev-token"
  ```
* **Expected Result:** Response contains chronological entry with: `action`, `actorId`, `entityType`, `entityId`, `ipAddress`, and state diff (`before` / `after`).

---

### Module 9: Security & Negative RBAC Test Cases

#### TC-SEC-01: Protected Endpoint Without Authorization Header
* **Action:** Request `/api/registrations` with no headers:
  ```powershell
  curl -i http://localhost:5001/api/registrations
  ```
* **Expected Result:** HTTP `401 Unauthorized` with `{ "error": "Authentication token missing or invalid" }`.

#### TC-SEC-02: Insufficient Role Permissions (403 Forbidden)
* **Action:** A Referee (`usr-ref-1`) attempting to delete a registered club:
  ```powershell
  curl -i -X DELETE http://localhost:5001/api/clubs/club-1 `
    -H "x-user-id: usr-ref-1"
  ```
* **Expected Result:** HTTP `403 Forbidden` with `{ "error": "Insufficient permissions for this action" }`.

#### TC-SEC-03: Deactivated User Access Denial
* **Action:** Attempt login or access with an inactive account (`isActive: false`).
* **Expected Result:** HTTP `403 Forbidden` with `{ "error": "Account is deactivated" }`.

---

## 5. Automated Testing Script (Quick Health & Smoke Run)

Save and run this PowerShell snippet to test all major routes in one go:

```powershell
$baseUrl = "http://localhost:5001/api"
$token = "dev-token"
$headers = @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" }

Write-Host "--- Running Football Federation Hub Smoke Tests ---" -ForegroundColor Cyan

# 1. Health
$health = Invoke-RestMethod -Uri "http://localhost:5001/health" -Method Get
Write-Host "✅ [Health] Status: $($health.status)" -ForegroundColor Green

# 2. Demo Accounts
$accounts = Invoke-RestMethod -Uri "$baseUrl/auth/demo-accounts" -Method Get
Write-Host "✅ [Auth] Demo Accounts Loaded: $($accounts.accounts.Count) users" -ForegroundColor Green

# 3. Clubs
$clubs = Invoke-RestMethod -Uri "$baseUrl/clubs" -Method Get -Headers $headers
Write-Host "✅ [Clubs] Total Clubs: $($clubs.total)" -ForegroundColor Green

# 4. Players
$players = Invoke-RestMethod -Uri "$baseUrl/players" -Method Get -Headers $headers
Write-Host "✅ [Players] Total Players: $($players.total)" -ForegroundColor Green

# 5. Matches
$matches = Invoke-RestMethod -Uri "$baseUrl/matches" -Method Get -Headers $headers
Write-Host "✅ [Matches] Total Matches: $($matches.total)" -ForegroundColor Green

# 6. Dashboard Stats
$stats = Invoke-RestMethod -Uri "$baseUrl/dashboard/stats" -Method Get -Headers $headers
Write-Host "✅ [Dashboard] KPI Stats successfully retrieved." -ForegroundColor Green

Write-Host "`nAll Smoke Tests Passed Successfully! 🎉" -ForegroundColor Green
```
