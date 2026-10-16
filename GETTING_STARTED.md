# Football Federation Hub — Getting Started & User Journey Guide

A complete step-by-step walkthrough on how to start using the **Football Federation Hub** (FFMS) as an administrator, competition organizer, club official, referee, or public visitor.

---

## 1. System URLs & Status

Both servers are currently running on your machine:

| Component | URL | Purpose |
| :--- | :--- | :--- |
| **Frontend Web App** | [http://localhost:5173](http://localhost:5173) | Main user interface (Public portal & Dashboard) |
| **Authentication Center** | [http://localhost:5173/auth](http://localhost:5173/auth) | 1-Click demo accounts and role switcher |
| **Executive Dashboard** | [http://localhost:5173/dashboard](http://localhost:5173/dashboard) | Role-segregated management center |
| **Backend REST API** | [http://localhost:5001/api](http://localhost:5001/api) | High-performance JSON database API |
| **Interactive API Docs**| [http://localhost:5001/docs](http://localhost:5001/docs) | Interactive Swagger-style documentation |

---

## 2. Where to Start (The 3 Entry Points)

### Entry Point A: Public Landing Portal (`/`)
* **URL:** `http://localhost:5173`
* **What you see:** Federation announcement banners, official league tables, recent match fixtures, and affiliated club directory.
* **Next action:** Click **"Federation Portal"** or **"Sign In"** in the top navigation to enter the management system.

### Entry Point B: Authentication & Role Switcher (`/auth`)
* **URL:** `http://localhost:5173/auth`
* **What you see:** 1-Click login buttons for each of the 8 federation roles.
* **How to use:**
  1. Click any role card (e.g., **Super Admin**, **Club Admin**, **Referee**).
  2. The form will automatically populate the email and password (`password123`).
  3. Click **"Sign In"** to jump directly to your customized dashboard.

### Entry Point C: Quick Role Switcher (From anywhere in the Dashboard)
* Once inside `http://localhost:5173/dashboard`, look at the **top bar**:
* Click the **role badge dropdown** (e.g. `Super Admin ▾`) to switch between any of the 8 roles with a single click — no re-login required.

---

## 3. Step-by-Step User Journeys by Role

Choose your persona below to start exploring the system:

---

### 🏃 Journey 1: Club Admin (Club Official)
* **Demo Account:** `club@saintgeorge.org` (Abebe Bikila — St. George SC)
* **Goal:** Manage squad, submit new players for federation licensing, and initiate transfer deals.

1. **Sign In:** Go to `/auth`, click **Club Admin**, and log in.
2. **Review Your Club:**
   - In the sidebar under **Clubs & Squads**, click **Clubs** (`/dashboard/clubs`).
   - View your club details, stadium, founded year, and current active roster.
3. **Register a New Player for Your Squad:**
   - Go to **Players** (`/dashboard/players`) -> Click **"Add Player"**.
   - Enter player name, date of birth, position (e.g. *Forward*), and contact details.
   - Click **Create Player**.
4. **Submit for Official Federation License:**
   - Go to **Registrations** (`/dashboard/registrations`).
   - Click **"Register Player"**, select your player, target season (`2024/2025`), and jersey number.
   - The status will be marked **Pending** awaiting Federation Officer approval.
5. **Request a Transfer:**
   - Go to **Transfers** (`/dashboard/transfers`) -> Click **"Request Transfer"**.
   - Select a player from another club, set the transfer fee and contract length.

---

### 📋 Journey 2: Registration Officer (Federation Licensing)
* **Demo Account:** `registration@federation.org` (Almaz Girma)
* **Goal:** Review club player applications, verify documents, and issue official digital licenses.

1. **Sign In:** Go to `/auth`, click **Registration Officer**.
2. **Inspect Pending Applications:**
   - In the sidebar under **Registrations & Market**, click **Registrations** (`/dashboard/registrations`).
   - Click the **"Pending"** filter tab to see submissions awaiting review.
3. **Inspect Identity & Medical Documents:**
   - Click the **Eye icon** next to any registration to inspect attached passport and medical clearance.
   - You can also navigate to **Documents** (`/dashboard/documents`) to review and verify player credentials.
4. **Issue License:**
   - Click the green **Checkmark icon** on a pending registration.
   - Enter a License Number (e.g. `LIC-2025-0089`) or click **Approve**.
   - The player's status immediately transitions to **Active & Licensed**.

---

### 🔄 Journey 3: Transfer Officer (Market Compliance)
* **Demo Account:** `transfer@federation.org` (Yared Wolde)
* **Goal:** Oversee transfer windows, approve contract agreements, and finalize squad movements.

1. **Sign In:** Go to `/auth`, click **Transfer Officer**.
2. **Review Transfer Queue:**
   - In the sidebar under **Registrations & Market**, click **Transfers** (`/dashboard/transfers`).
   - Notice the status pills: `requested`, `approved`, `completed`, `rejected`.
3. **Adjudicate a Transfer:**
   - Click on a transfer in `requested` status.
   - Review the buying club, selling club, and transfer fee.
   - Click **"Approve"** to authorize the deal.
   - The player's active club is automatically reassigned in the database.

---

### 🏆 Journey 4: Competition Admin (League & Tournament Operations)
* **Demo Account:** `competition@federation.org` (Dawit Kebede)
* **Goal:** Manage seasons, divisions, schedule match fixtures, and inspect league tables.

1. **Sign In:** Go to `/auth`, click **Competition Admin**.
2. **Review Seasons & Divisions:**
   - Click **Seasons** (`/dashboard/seasons`) to see the active 2024/2025 or 2025/2026 season.
   - Click **Divisions** (`/dashboard/divisions`) to inspect Tier 1 Premier League and Tier 2 Division One.
3. **Schedule Match Fixtures:**
   - Click **Matches & Live** (`/dashboard/matches`).
   - Click the **"Schedule Match"** button.
   - Choose Home Team, Away Team, Competition, Venue, and Date.
4. **Inspect League Standings:**
   - Click **Standings** (`/dashboard/standings`).
   - Select **"Premier League"** to view real-time computed points, goal differences, and rankings.

---

### ⏱️ Journey 5: Referee (Match Official)
* **Demo Account:** `referee@federation.org` (Bamlak Tessema)
* **Goal:** Officiate scheduled fixtures, record live match scores, goals, and card penalties.

1. **Sign In:** Go to `/auth`, click **Referee**.
2. **Find Your Match:**
   - Go to **Matches & Live** (`/dashboard/matches`).
   - Filter by **"Scheduled"** or **"In Progress"**.
3. **Enter Score & Events:**
   - Click **"Enter Score"** on a match card.
   - Enter Home Goals and Away Goals -> Click **"Save Score"**.
   - Record disciplinary cards or foul reports that will automatically link to the Disciplinary committee.

---

### ⚖️ Journey 6: Disciplinary Officer (Judicial & Fair Play)
* **Demo Account:** `disciplinary@federation.org` (Mulugeta Assefa)
* **Goal:** Track yellow/red card accumulations, conduct hearings, and issue suspensions or fines.

1. **Sign In:** Go to `/auth`, click **Disciplinary Officer**.
2. **Inspect Open Cases:**
   - In the sidebar under **Governance & Discipline**, click **Disciplinary** (`/dashboard/disciplinary`).
   - Filter by **"Open"** or **"Suspended"**.
3. **Issue Sanctions:**
   - Click **"Review Case"** on a red card incident.
   - Set the sanction (e.g. *2-match suspension + 5,000 ETB fine*).
   - Update the status to `served` or `dismissed` after committee review.

---

### 🛡️ Journey 7: Super Admin (Federation Executive & Governance)
* **Demo Account:** `admin@federation.org` (Solomon Tadesse)
* **Goal:** Full system governance, inspect audit logs, and manage federation configuration.

1. **Sign In:** Go to `/auth`, click **Super Admin**.
2. **All Menus Available:**
   - You have access to all 13 menus across all 5 sections.
3. **Inspect the Audit Trail:**
   - Click **Audit Trail** (`/dashboard/audit`).
   - Every single creation, update, approval, or deletion across the entire system is logged here with exact timestamp, officer ID, IP address, and state diff.
4. **Reset Database to Pristine State:**
   - If you want a fresh start after testing, click the **"Reset Seed"** button in the top right header at any time.

---

## 4. Summary of Useful Shortcuts

| Action | How to do it |
| :--- | :--- |
| **Instant Role Switch** | Click the role badge at the top-left of the header (`Super Admin ▾`) |
| **Public Portal** | Click **"Public Portal"** in the top header or navigate to `http://localhost:5173/` |
| **Reset Data** | Click **"Reset Seed"** with the refresh icon in the top header |
| **API Test Requests** | Open [api-requests.http](file:///d:/AAprojets/football-federation-hub/api-requests.http) to send 1-click test calls |
| **Automated Test Cases** | See [TESTING.md](file:///d:/AAprojets/football-federation-hub/TESTING.md) for full cURL & PowerShell scripts |
