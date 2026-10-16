-- ==============================================================================
-- FOOTBALL FEDERATION HUB - POSTGRESQL COMPLETE DATABASE SCHEMA & SEED SCRIPT
-- Tested and ready to run directly in pgAdmin 4 Query Tool or via psql CLI.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
SET client_min_messages TO warning;
-- 2. ENUM TYPES
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
    'super_admin',
    'federation_admin',
    'competition_admin',
    'registration_officer',
    'transfer_officer',
    'club_admin',
    'referee',
    'disciplinary_officer',
    'player',
    'public'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE player_status AS ENUM ('active', 'inactive', 'suspended', 'retired');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE club_status AS ENUM ('active', 'inactive', 'suspended', 'pending');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE registration_status AS ENUM ('pending', 'active', 'expired', 'transferred', 'rejected', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE transfer_status AS ENUM ('requested', 'approved', 'rejected', 'cancelled', 'completed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE match_status AS ENUM ('scheduled', 'in_progress', 'completed', 'postponed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE match_event_type AS ENUM ('goal', 'own_goal', 'yellow_card', 'red_card', 'second_yellow', 'substitution', 'penalty_scored', 'penalty_missed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE card_type AS ENUM ('yellow', 'red', 'second_yellow');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE disciplinary_status AS ENUM ('open', 'suspended', 'served', 'appealed', 'dismissed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE document_status AS ENUM ('pending', 'verified', 'rejected', 'expired');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 3. DROP EXISTING TABLES IN REVERSE DEPENDENCY ORDER (Optional, clean slate)
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS card_accumulations CASCADE;
DROP TABLE IF EXISTS disciplinary_cases CASCADE;
DROP TABLE IF EXISTS match_events CASCADE;
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS transfers CASCADE;
DROP TABLE IF EXISTS player_registrations CASCADE;
DROP TABLE IF EXISTS players CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS competitions CASCADE;
DROP TABLE IF EXISTS divisions CASCADE;
DROP TABLE IF EXISTS seasons CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS clubs CASCADE;

-- ==============================================================================
-- 4. TABLE CREATIONS (DDL)
-- ==============================================================================

-- CLUBS
CREATE TABLE clubs (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  short_name VARCHAR(64),
  founded_year INTEGER,
  city VARCHAR(128),
  country VARCHAR(128) DEFAULT 'Ethiopia',
  logo_url TEXT,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(64),
  address TEXT,
  registration_number VARCHAR(64) UNIQUE,
  status club_status DEFAULT 'active',
  president VARCHAR(255),
  secretary VARCHAR(255),
  stadium VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- USERS (RBAC Accounts)
CREATE TABLE users (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255),
  role user_role NOT NULL DEFAULT 'public',
  club_id VARCHAR(64) REFERENCES clubs(id) ON DELETE SET NULL,
  phone VARCHAR(64),
  is_active BOOLEAN DEFAULT TRUE,
  image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SEASONS
CREATE TABLE seasons (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- DIVISIONS (Pyramid Tiers)
CREATE TABLE divisions (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  tier INTEGER NOT NULL,
  season_id VARCHAR(64) REFERENCES seasons(id) ON DELETE CASCADE,
  description TEXT,
  max_clubs INTEGER DEFAULT 16,
  promotion_slots INTEGER DEFAULT 3,
  relegation_slots INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- COMPETITIONS
CREATE TABLE competitions (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(64) NOT NULL,
  season_id VARCHAR(64) REFERENCES seasons(id) ON DELETE CASCADE,
  division_id VARCHAR(64) REFERENCES divisions(id) ON DELETE SET NULL,
  description TEXT,
  rules TEXT,
  registration_deadline DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TEAMS
CREATE TABLE teams (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  club_id VARCHAR(64) NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  competition_id VARCHAR(64) NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  season_id VARCHAR(64) NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  division_id VARCHAR(64) REFERENCES divisions(id) ON DELETE SET NULL,
  squad_number INTEGER DEFAULT 25,
  coach_id VARCHAR(64),
  status VARCHAR(32) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PLAYERS
CREATE TABLE players (
  id VARCHAR(64) PRIMARY KEY,
  first_name VARCHAR(128) NOT NULL,
  last_name VARCHAR(128) NOT NULL,
  date_of_birth DATE NOT NULL,
  nationality VARCHAR(128) DEFAULT 'Ethiopia',
  position VARCHAR(64),
  photo_url TEXT,
  phone VARCHAR(64),
  email VARCHAR(255),
  id_document_type VARCHAR(64),
  id_document_number VARCHAR(128),
  status player_status DEFAULT 'active',
  address TEXT,
  height NUMERIC(5,2),
  weight NUMERIC(5,2),
  preferred_foot VARCHAR(16) DEFAULT 'right',
  current_club_id VARCHAR(64) REFERENCES clubs(id) ON DELETE SET NULL,
  current_club_name VARCHAR(255),
  jersey_number INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PLAYER REGISTRATIONS (Official Licenses)
CREATE TABLE player_registrations (
  id VARCHAR(64) PRIMARY KEY,
  player_id VARCHAR(64) NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  club_id VARCHAR(64) NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  team_id VARCHAR(64) REFERENCES teams(id) ON DELETE SET NULL,
  competition_id VARCHAR(64) REFERENCES competitions(id) ON DELETE SET NULL,
  season_id VARCHAR(64) NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  status registration_status DEFAULT 'pending',
  license_number VARCHAR(64) UNIQUE,
  license_expiry DATE,
  registration_date DATE NOT NULL,
  expiry_date DATE,
  squad_number INTEGER,
  notes TEXT,
  reviewed_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TRANSFERS (TMS)
CREATE TABLE transfers (
  id VARCHAR(64) PRIMARY KEY,
  player_id VARCHAR(64) NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  from_club_id VARCHAR(64) NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  to_club_id VARCHAR(64) NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  from_registration_id VARCHAR(64),
  to_registration_id VARCHAR(64),
  status transfer_status DEFAULT 'requested',
  transfer_fee NUMERIC(12,2) DEFAULT 0,
  transfer_date DATE,
  reason TEXT,
  reviewed_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MATCHES
CREATE TABLE matches (
  id VARCHAR(64) PRIMARY KEY,
  home_team_id VARCHAR(64) NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  away_team_id VARCHAR(64) NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  competition_id VARCHAR(64) NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  season_id VARCHAR(64) NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  match_date TIMESTAMPTZ NOT NULL,
  venue VARCHAR(255),
  status match_status DEFAULT 'scheduled',
  home_score INTEGER DEFAULT 0,
  away_score INTEGER DEFAULT 0,
  referee_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  referee_name VARCHAR(255),
  round VARCHAR(64),
  gameweek INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- MATCH EVENTS (Goals, Cards, Substitutions)
CREATE TABLE match_events (
  id VARCHAR(64) PRIMARY KEY,
  match_id VARCHAR(64) NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  minute INTEGER NOT NULL,
  event_type match_event_type NOT NULL,
  team_id VARCHAR(64) NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  team_name VARCHAR(255),
  player_id VARCHAR(64) REFERENCES players(id) ON DELETE SET NULL,
  player_name VARCHAR(255),
  assisted_by_player_id VARCHAR(64) REFERENCES players(id) ON DELETE SET NULL,
  assisted_by_player_name VARCHAR(255),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- DISCIPLINARY CASES
CREATE TABLE disciplinary_cases (
  id VARCHAR(64) PRIMARY KEY,
  player_id VARCHAR(64) REFERENCES players(id) ON DELETE SET NULL,
  player_name VARCHAR(255),
  club_id VARCHAR(64) REFERENCES clubs(id) ON DELETE SET NULL,
  competition_id VARCHAR(64) REFERENCES competitions(id) ON DELETE SET NULL,
  match_id VARCHAR(64) REFERENCES matches(id) ON DELETE SET NULL,
  offense TEXT NOT NULL,
  card_type card_type,
  match_minute INTEGER,
  suspension_matches INTEGER DEFAULT 0,
  suspension_start DATE,
  suspension_end DATE,
  fine NUMERIC(10,2) DEFAULT 0,
  status disciplinary_status DEFAULT 'open',
  notes TEXT,
  reviewed_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CARD ACCUMULATIONS
CREATE TABLE card_accumulations (
  id VARCHAR(64) PRIMARY KEY,
  player_id VARCHAR(64) NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  player_name VARCHAR(255),
  competition_id VARCHAR(64) NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  season_id VARCHAR(64) NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  yellow_cards INTEGER DEFAULT 0,
  red_cards INTEGER DEFAULT 0,
  total_suspension_matches INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DOCUMENTS (Compliance Vault)
CREATE TABLE documents (
  id VARCHAR(64) PRIMARY KEY,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(128),
  file_size BIGINT,
  document_type VARCHAR(64) NOT NULL,
  owner_type VARCHAR(64) NOT NULL,
  owner_id VARCHAR(64) NOT NULL,
  url TEXT,
  status document_status DEFAULT 'pending',
  verified_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  expiry_date DATE,
  uploaded_by VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AUDIT LOG (Immutable Event Trace)
CREATE TABLE audit_log (
  id VARCHAR(64) PRIMARY KEY,
  actor_id VARCHAR(64),
  actor_name VARCHAR(255),
  role VARCHAR(64),
  action VARCHAR(128) NOT NULL,
  entity_type VARCHAR(64) NOT NULL,
  entity_id VARCHAR(64),
  before_state JSONB,
  after_state JSONB,
  metadata JSONB,
  ip VARCHAR(64),
  user_agent TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 5. INDEXES FOR HIGH-PERFORMANCE SEARCH
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_players_club ON players(current_club_id);
CREATE INDEX idx_players_status ON players(status);
CREATE INDEX idx_registrations_player ON player_registrations(player_id);
CREATE INDEX idx_registrations_club ON player_registrations(club_id);
CREATE INDEX idx_transfers_player ON transfers(player_id);
CREATE INDEX idx_matches_comp ON matches(competition_id);
CREATE INDEX idx_matches_date ON matches(match_date);
CREATE INDEX idx_events_match ON match_events(match_id);
CREATE INDEX idx_audit_timestamp ON audit_log(timestamp DESC);

-- ==============================================================================
-- 6. SEED DATA (DML)
-- ==============================================================================

-- 6.1 CLUBS
INSERT INTO clubs (id, name, short_name, founded_year, city, country, logo_url, contact_email, contact_phone, address, registration_number, status, president, secretary, stadium)
VALUES
('club-1', 'Saint George SC', 'St. George', 1935, 'Addis Ababa', 'Ethiopia', 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=150', 'info@saintgeorgefc.com', '+251 11 123 4567', 'Churchill Road, Addis Ababa', 'FED-CLB-001', 'active', 'Abinet Gebremeskel', 'Tesfaye Kahsay', 'Addis Ababa Stadium (Cap: 35,000)'),
('club-2', 'Ethiopian Coffee SC', 'Ethio Coffee', 1976, 'Addis Ababa', 'Ethiopia', 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=150', 'contact@ethiopiancoffee.et', '+251 11 234 5678', 'Mexico Square, Addis Ababa', 'FED-CLB-002', 'active', 'Fekade Mamo', 'Biruk Hailu', 'Abebe Bikila Stadium (Cap: 30,000)'),
('club-3', 'Fasil Kenema SC', 'Fasil', 1968, 'Gondar', 'Ethiopia', 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=150', 'fasil@gondarfootball.et', '+251 58 111 2233', 'Fasil Castles Ave, Gondar', 'FED-CLB-003', 'active', 'Girma Yeshitla', 'Getachew Zewde', 'Fasiledes Stadium (Cap: 20,000)'),
('club-4', 'Bahir Dar Kenema FC', 'Bahir Dar', 1973, 'Bahir Dar', 'Ethiopia', 'https://images.unsplash.com/photo-1517927033932-b3d18e61fb3a?w=150', 'info@bahirdarkenema.et', '+251 58 220 3344', 'Lake Tana Blvd, Bahir Dar', 'FED-CLB-004', 'active', 'Melaku Alebel', 'Dagnachew Assefa', 'Bahir Dar Stadium (Cap: 60,000)'),
('club-5', 'Hawassa City SC', 'Hawassa', 1977, 'Hawassa', 'Ethiopia', 'https://images.unsplash.com/photo-1511886929837-354d827aae26?w=150', 'info@hawassacityfc.et', '+251 46 220 5566', 'Lake Hawassa Road, Hawassa', 'FED-CLB-005', 'active', 'Tiruneh Desta', 'Kifle Yohannes', 'Hawassa Stadium (Cap: 25,000)'),
('club-6', 'Adama City FC', 'Adama City', 1991, 'Adama', 'Ethiopia', 'https://images.unsplash.com/photo-1489944445391-11dd35772427?w=150', 'contact@adamacityfc.et', '+251 22 111 8899', 'Expressway Way, Adama', 'FED-CLB-006', 'active', 'Bekele Tolessa', 'Shimeles Kebede', 'Abebe Bikila Adama (Cap: 15,000)');

-- 6.2 USERS (Passwords are hashed 'password123')
INSERT INTO users (id, name, email, password_hash, role, club_id, phone, is_active, image)
VALUES
('usr-admin-1', 'Solomon Tadesse', 'admin@federation.org', '$2a$10$4QsGOcc96FzZ6GEnuIEgZuRLISuDX7fA9r5yKV7MAMwJM7pdD6nH.', 'super_admin', NULL, '+251911223344', TRUE, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'),
('usr-fed-1', 'Helen Berhanu', 'fed@federation.org', '$2a$10$4QsGOcc96FzZ6GEnuIEgZuRLISuDX7fA9r5yKV7MAMwJM7pdD6nH.', 'federation_admin', NULL, '+251911334455', TRUE, 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'),
('usr-comp-1', 'Dawit Kebede', 'competition@federation.org', '$2a$10$4QsGOcc96FzZ6GEnuIEgZuRLISuDX7fA9r5yKV7MAMwJM7pdD6nH.', 'competition_admin', NULL, '+251911445566', TRUE, NULL),
('usr-reg-1', 'Almaz Girma', 'registration@federation.org', '$2a$10$4QsGOcc96FzZ6GEnuIEgZuRLISuDX7fA9r5yKV7MAMwJM7pdD6nH.', 'registration_officer', NULL, '+251911556677', TRUE, NULL),
('usr-trf-1', 'Yared Wolde', 'transfer@federation.org', '$2a$10$4QsGOcc96FzZ6GEnuIEgZuRLISuDX7fA9r5yKV7MAMwJM7pdD6nH.', 'transfer_officer', NULL, '+251911667788', TRUE, NULL),
('usr-club-1', 'Abebe Bikila', 'club@saintgeorge.org', '$2a$10$4QsGOcc96FzZ6GEnuIEgZuRLISuDX7fA9r5yKV7MAMwJM7pdD6nH.', 'club_admin', 'club-1', '+251911778899', TRUE, NULL),
('usr-ref-1', 'Bamlak Tessema', 'referee@federation.org', '$2a$10$4QsGOcc96FzZ6GEnuIEgZuRLISuDX7fA9r5yKV7MAMwJM7pdD6nH.', 'referee', NULL, '+251911889900', TRUE, NULL),
('usr-disc-1', 'Mulugeta Assefa', 'disciplinary@federation.org', '$2a$10$4QsGOcc96FzZ6GEnuIEgZuRLISuDX7fA9r5yKV7MAMwJM7pdD6nH.', 'disciplinary_officer', NULL, '+251911990011', TRUE, NULL);

-- 6.3 SEASONS
INSERT INTO seasons (id, name, start_date, end_date, is_active, description)
VALUES
('season-2025-2026', '2025/2026 Season', '2025-09-01', '2026-06-30', TRUE, 'Current official football federation championship season'),
('season-2024-2025', '2024/2025 Season', '2024-09-01', '2025-06-30', FALSE, 'Previous season - Concluded');

-- 6.4 DIVISIONS
INSERT INTO divisions (id, name, tier, season_id, description, max_clubs, promotion_slots, relegation_slots)
VALUES
('div-premier', 'Premier League (Division 1)', 1, 'season-2025-2026', 'Top flight national football league', 16, 0, 3),
('div-super', 'Super League (Division 2)', 2, 'season-2025-2026', 'Second tier national championship', 20, 3, 3);

-- 6.5 COMPETITIONS
INSERT INTO competitions (id, name, type, season_id, division_id, description, rules, registration_deadline, is_active)
VALUES
('comp-pl', 'National Premier League', 'league', 'season-2025-2026', 'div-premier', 'Main round-robin home-and-away league tournament', '3 points for win, 1 for draw, 0 for loss. Head-to-head then goal difference tiebreakers.', '2025-08-25', TRUE),
('comp-cup', 'Federation Cup Knockout', 'cup', 'season-2025-2026', NULL, 'Single elimination cup tournament with penalty shootouts', 'Knockout format. Extra time (30 mins) followed by penalty kicks.', '2025-10-01', TRUE),
('comp-supercup', 'Super Cup 2025', 'friendly', 'season-2025-2026', NULL, 'Curtain raiser match between League Winner & Cup Winner', '90 mins plus direct penalty shootout.', '2025-08-20', FALSE);

-- 6.6 TEAMS
INSERT INTO teams (id, name, club_id, competition_id, season_id, division_id, squad_number, status)
VALUES
('team-sg-pl', 'Saint George First Team', 'club-1', 'comp-pl', 'season-2025-2026', 'div-premier', 25, 'active'),
('team-ec-pl', 'Ethiopian Coffee First Team', 'club-2', 'comp-pl', 'season-2025-2026', 'div-premier', 26, 'active'),
('team-fk-pl', 'Fasil Kenema First Team', 'club-3', 'comp-pl', 'season-2025-2026', 'div-premier', 24, 'active'),
('team-bd-pl', 'Bahir Dar Kenema First Team', 'club-4', 'comp-pl', 'season-2025-2026', 'div-premier', 25, 'active'),
('team-hw-pl', 'Hawassa City First Team', 'club-5', 'comp-pl', 'season-2025-2026', 'div-premier', 23, 'active'),
('team-ad-pl', 'Adama City First Team', 'club-6', 'comp-pl', 'season-2025-2026', 'div-premier', 24, 'active');

-- 6.7 PLAYERS
INSERT INTO players (id, first_name, last_name, date_of_birth, nationality, position, photo_url, phone, email, id_document_type, id_document_number, status, height, weight, preferred_foot, current_club_id, current_club_name, jersey_number)
VALUES
('ply-1', 'Getaneh', 'Kebede', '1992-04-02', 'Ethiopia', 'Forward', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', '+251922001122', 'getaneh.kebede@saintgeorge.et', 'passport', 'EP8829102', 'active', 181, 76, 'right', 'club-1', 'Saint George SC', 9),
('ply-2', 'Abubeker', 'Nassir', '2000-02-23', 'Ethiopia', 'Forward', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', '+251922112233', 'abubeker@ethiopiancoffee.et', 'passport', 'EP9182736', 'active', 178, 72, 'right', 'club-2', 'Ethiopian Coffee SC', 10),
('ply-3', 'Shemeles', 'Bekele', '1990-10-17', 'Ethiopia', 'Midfielder', 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150', '+251922223344', 'shemeles@fasilkenema.et', 'national_id', 'NID-4491023', 'active', 172, 68, 'left', 'club-3', 'Fasil Kenema SC', 8),
('ply-4', 'Amanuel', 'Gebremichael', '1999-02-05', 'Ethiopia', 'Forward', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150', '+251922334455', 'amanuel@saintgeorge.et', 'passport', 'EP1029384', 'active', 180, 75, 'right', 'club-1', 'Saint George SC', 11),
('ply-5', 'Teklemariam', 'Shanko', '1998-01-02', 'Ethiopia', 'Goalkeeper', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150', '+251922445566', 'teklemariam@ethiopiancoffee.et', 'passport', 'EP5839201', 'active', 189, 84, 'right', 'club-2', 'Ethiopian Coffee SC', 1),
('ply-6', 'Aschalew', 'Tamene', '1991-11-22', 'Ethiopia', 'Defender', 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150', '+251922556677', 'aschalew@fasilkenema.et', 'national_id', 'NID-8829103', 'active', 185, 80, 'right', 'club-3', 'Fasil Kenema SC', 4),
('ply-7', 'Yared', 'Baye', '1995-01-09', 'Ethiopia', 'Defender', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150', '+251922667788', 'yared@bahirdar.et', 'passport', 'EP7483920', 'active', 187, 82, 'right', 'club-4', 'Bahir Dar Kenema FC', 5),
('ply-8', 'Mujib', 'Kassim', '1995-10-19', 'Ethiopia', 'Forward', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', '+251922778899', 'mujib@hawassa.et', 'passport', 'EP9382019', 'active', 183, 78, 'right', 'club-5', 'Hawassa City SC', 9);

-- 6.8 REGISTRATIONS
INSERT INTO player_registrations (id, player_id, club_id, team_id, competition_id, season_id, status, license_number, license_expiry, registration_date, expiry_date, squad_number, reviewed_by, reviewed_at)
VALUES
('reg-1', 'ply-1', 'club-1', 'team-sg-pl', 'comp-pl', 'season-2025-2026', 'active', 'LIC-2025-00109', '2026-06-30', '2025-08-15', '2026-06-30', 9, 'usr-reg-1', NOW()),
('reg-2', 'ply-2', 'club-2', 'team-ec-pl', 'comp-pl', 'season-2025-2026', 'active', 'LIC-2025-00210', '2026-06-30', '2025-08-16', '2026-06-30', 10, 'usr-reg-1', NOW()),
('reg-3', 'ply-3', 'club-3', 'team-fk-pl', 'comp-pl', 'season-2025-2026', 'active', 'LIC-2025-00308', '2026-06-30', '2025-08-17', '2026-06-30', 8, 'usr-reg-1', NOW()),
('reg-4', 'ply-4', 'club-1', 'team-sg-pl', 'comp-pl', 'season-2025-2026', 'active', 'LIC-2025-00111', '2026-06-30', '2025-08-18', '2026-06-30', 11, 'usr-reg-1', NOW()),
('reg-5', 'ply-5', 'club-2', 'team-ec-pl', 'comp-pl', 'season-2025-2026', 'active', 'LIC-2025-00201', '2026-06-30', '2025-08-19', '2026-06-30', 1, 'usr-reg-1', NOW()),
('reg-6', 'ply-8', 'club-5', 'team-hw-pl', 'comp-pl', 'season-2025-2026', 'pending', NULL, NULL, '2026-01-10', NULL, 9, NULL, NULL);

-- 6.9 TRANSFERS (TMS)
INSERT INTO transfers (id, player_id, from_club_id, to_club_id, from_registration_id, to_registration_id, status, transfer_fee, transfer_date, reason, reviewed_by, reviewed_at, review_notes)
VALUES
('trf-1', 'ply-4', 'club-3', 'club-1', NULL, 'reg-4', 'completed', 450000.00, '2025-08-14', 'Contract buyout agreement between clubs', 'usr-trf-1', NOW(), 'All documents and federation levy cleared.'),
('trf-2', 'ply-8', 'club-4', 'club-5', NULL, NULL, 'approved', 320000.00, '2026-01-08', 'Permanent transfer on mutually agreed fee', 'usr-trf-1', NOW(), 'Approved pending player registration finalization');

-- 6.10 MATCHES
INSERT INTO matches (id, home_team_id, away_team_id, competition_id, season_id, match_date, venue, status, home_score, away_score, referee_id, referee_name, round, gameweek, notes)
VALUES
('match-1', 'team-sg-pl', 'team-ec-pl', 'comp-pl', 'season-2025-2026', '2025-10-15 15:00:00+00', 'Addis Ababa Stadium', 'completed', 2, 1, 'usr-ref-1', 'Bamlak Tessema', 'Matchday 1', 1, 'Sheger Derby match. High intensity.'),
('match-2', 'team-fk-pl', 'team-bd-pl', 'comp-pl', 'season-2025-2026', '2025-10-16 15:00:00+00', 'Fasiledes Stadium, Gondar', 'completed', 3, 0, 'usr-ref-1', 'Bamlak Tessema', 'Matchday 1', 1, 'Northern Derby.'),
('match-3', 'team-hw-pl', 'team-ad-pl', 'comp-pl', 'season-2025-2026', '2025-10-17 15:00:00+00', 'Hawassa Stadium', 'completed', 1, 1, NULL, NULL, 'Matchday 1', 1, 'Rift Valley encounter.'),
('match-4', 'team-ec-pl', 'team-fk-pl', 'comp-pl', 'season-2025-2026', '2025-10-22 15:00:00+00', 'Abebe Bikila Stadium', 'completed', 2, 2, NULL, NULL, 'Matchday 2', 2, 'Exciting 4-goal thriller.'),
('match-5', 'team-sg-pl', 'team-bd-pl', 'comp-pl', 'season-2025-2026', '2026-10-20 16:00:00+00', 'Addis Ababa Stadium', 'scheduled', 0, 0, NULL, NULL, 'Matchday 3', 3, 'Upcoming weekend headline fixture'),
('match-6', 'team-hw-pl', 'team-ec-pl', 'comp-pl', 'season-2025-2026', '2026-10-21 15:00:00+00', 'Hawassa Stadium', 'scheduled', 0, 0, NULL, NULL, 'Matchday 3', 3, 'Scheduled fixture');

-- 6.11 MATCH EVENTS
INSERT INTO match_events (id, match_id, minute, event_type, team_id, team_name, player_id, player_name, assisted_by_player_id, assisted_by_player_name, description)
VALUES
('evt-1', 'match-1', 23, 'goal', 'team-sg-pl', 'Saint George First Team', 'ply-1', 'Getaneh Kebede', NULL, NULL, 'Low drilled finish from right side of the penalty area'),
('evt-2', 'match-1', 41, 'goal', 'team-ec-pl', 'Ethiopian Coffee First Team', 'ply-2', 'Abubeker Nassir', NULL, NULL, 'Header from corner kick'),
('evt-3', 'match-1', 68, 'yellow_card', 'team-ec-pl', 'Ethiopian Coffee First Team', 'ply-5', 'Teklemariam Shanko', NULL, NULL, 'Dissent towards referee decision'),
('evt-4', 'match-1', 88, 'goal', 'team-sg-pl', 'Saint George First Team', 'ply-4', 'Amanuel Gebremichael', 'ply-1', 'Getaneh Kebede', 'Late winner deflected into bottom corner'),
('evt-5', 'match-2', 15, 'goal', 'team-fk-pl', 'Fasil Kenema First Team', 'ply-3', 'Shemeles Bekele', NULL, NULL, 'Direct free-kick from 24 yards'),
('evt-6', 'match-2', 34, 'yellow_card', 'team-bd-pl', 'Bahir Dar Kenema First Team', 'ply-7', 'Yared Baye', NULL, NULL, 'Reckless tackle on opponent forward');

-- 6.12 DISCIPLINARY CASES
INSERT INTO disciplinary_cases (id, player_id, player_name, club_id, competition_id, match_id, offense, card_type, match_minute, suspension_matches, suspension_start, suspension_end, fine, status, notes, reviewed_by, reviewed_at)
VALUES
('disc-1', 'ply-7', 'Yared Baye', 'club-4', 'comp-pl', 'match-2', 'Violent conduct and verbal abuse towards match official', 'yellow', 34, 1, '2025-10-17', '2025-10-24', 15000.00, 'served', 'Player submitted apology and served mandatory one match ban.', 'usr-disc-1', NOW()),
('disc-2', 'ply-5', 'Teklemariam Shanko', 'club-2', 'comp-pl', 'match-1', 'Yellow card accumulation warning', 'yellow', 68, 0, NULL, NULL, 5000.00, 'open', 'Official warning issued under federation article 42.1', 'usr-disc-1', NOW());

-- 6.13 CARD ACCUMULATIONS
INSERT INTO card_accumulations (id, player_id, player_name, competition_id, season_id, yellow_cards, red_cards, total_suspension_matches)
VALUES
('card-acc-1', 'ply-1', 'Getaneh Kebede', 'comp-pl', 'season-2025-2026', 0, 0, 0),
('card-acc-2', 'ply-5', 'Teklemariam Shanko', 'comp-pl', 'season-2025-2026', 1, 0, 0),
('card-acc-3', 'ply-7', 'Yared Baye', 'comp-pl', 'season-2025-2026', 2, 0, 1);

-- 6.14 DOCUMENTS
INSERT INTO documents (id, file_name, file_type, file_size, document_type, owner_type, owner_id, url, status, verified_by, verified_at, expiry_date, uploaded_by)
VALUES
('doc-1', 'getaneh_kebede_passport.pdf', 'application/pdf', 2450000, 'passport', 'player', 'ply-1', 'https://example.com/docs/passport_ply_1.pdf', 'verified', 'usr-reg-1', NOW(), '2029-05-12', 'usr-club-1'),
('doc-2', 'saint_george_license_2025.pdf', 'application/pdf', 1850000, 'license', 'club', 'club-1', 'https://example.com/docs/club_license_1.pdf', 'verified', 'usr-fed-1', NOW(), '2026-06-30', 'usr-club-1'),
('doc-3', 'mujib_kassim_medical_cert.pdf', 'application/pdf', 1200000, 'medical_certificate', 'player', 'ply-8', NULL, 'pending', NULL, NULL, NULL, 'usr-reg-1');

-- 6.15 AUDIT LOG
INSERT INTO audit_log (id, actor_id, actor_name, role, action, entity_type, entity_id, before_state, after_state, metadata, timestamp)
VALUES
('aud-1', 'usr-admin-1', 'Solomon Tadesse', 'super_admin', 'system.init', 'system', 'system', NULL, '{"version": "1.0.0", "environment": "production"}'::jsonb, NULL, NOW() - INTERVAL '30 days'),
('aud-2', 'usr-fed-1', 'Helen Berhanu', 'federation_admin', 'season.create', 'season', 'season-2025-2026', NULL, '{"name": "2025/2026 Season", "isActive": true}'::jsonb, NULL, NOW() - INTERVAL '29 days'),
('aud-3', 'usr-trf-1', 'Yared Wolde', 'transfer_officer', 'transfer.approve', 'transfer', 'trf-1', NULL, '{"status": "completed"}'::jsonb, NULL, NOW() - INTERVAL '15 days');

-- ==============================================================================
-- 7. POWERFUL REAL-TIME REPORTING VIEWS
-- ==============================================================================

-- 7.1 Real-Time League Table Standings Calculation
CREATE OR REPLACE VIEW view_league_standings AS
WITH team_matches AS (
  SELECT 
    home_team_id AS team_id,
    competition_id,
    season_id,
    home_score AS gf,
    away_score AS ga,
    CASE 
      WHEN home_score > away_score THEN 3
      WHEN home_score = away_score THEN 1
      ELSE 0
    END AS points,
    CASE 
      WHEN home_score > away_score THEN 1
      ELSE 0
    END AS won,
    CASE 
      WHEN home_score = away_score THEN 1
      ELSE 0
    END AS drawn,
    CASE 
      WHEN home_score < away_score THEN 1
      ELSE 0
    END AS lost
  FROM matches
  WHERE status = 'completed'
  
  UNION ALL
  
  SELECT 
    away_team_id AS team_id,
    competition_id,
    season_id,
    away_score AS gf,
    home_score AS ga,
    CASE 
      WHEN away_score > home_score THEN 3
      WHEN away_score = home_score THEN 1
      ELSE 0
    END AS points,
    CASE 
      WHEN away_score > home_score THEN 1
      ELSE 0
    END AS won,
    CASE 
      WHEN away_score = home_score THEN 1
      ELSE 0
    END AS drawn,
    CASE 
      WHEN away_score < home_score THEN 1
      ELSE 0
    END AS lost
  FROM matches
  WHERE status = 'completed'
)
SELECT 
  ROW_NUMBER() OVER (
    PARTITION BY tm.competition_id, tm.season_id 
    ORDER BY SUM(tm.points) DESC, (SUM(tm.gf) - SUM(tm.ga)) DESC, SUM(tm.gf) DESC
  ) AS position,
  tm.team_id,
  t.name AS team_name,
  c.name AS club_name,
  tm.competition_id,
  tm.season_id,
  COUNT(*) AS played,
  SUM(tm.won) AS won,
  SUM(tm.drawn) AS drawn,
  SUM(tm.lost) AS lost,
  SUM(tm.gf) AS goals_for,
  SUM(tm.ga) AS goals_against,
  (SUM(tm.gf) - SUM(tm.ga)) AS goal_difference,
  SUM(tm.points) AS points
FROM team_matches tm
JOIN teams t ON t.id = tm.team_id
JOIN clubs c ON c.id = t.club_id
GROUP BY tm.team_id, t.name, c.name, tm.competition_id, tm.season_id;

-- 7.2 Top Scorers Leaderboard View (Golden Boot)
CREATE OR REPLACE VIEW view_top_scorers AS
SELECT 
  me.player_id,
  me.player_name,
  p.current_club_name,
  t.competition_id,
  COUNT(*) AS goals
FROM match_events me
JOIN teams t ON t.id = me.team_id
LEFT JOIN players p ON p.id = me.player_id
WHERE me.event_type IN ('goal', 'penalty_scored') AND me.player_id IS NOT NULL
GROUP BY me.player_id, me.player_name, p.current_club_name, t.competition_id
ORDER BY goals DESC;

-- 7.3 Player Digital Passport & Eligibility Summary View
CREATE OR REPLACE VIEW view_player_passports AS
SELECT 
  p.id AS player_id,
  p.first_name || ' ' || p.last_name AS full_name,
  p.nationality,
  p.date_of_birth,
  p.position,
  p.jersey_number,
  c.name AS club_name,
  pr.license_number,
  pr.status AS license_status,
  pr.license_expiry,
  COALESCE(ca.yellow_cards, 0) AS season_yellow_cards,
  COALESCE(ca.red_cards, 0) AS season_red_cards,
  CASE 
    WHEN p.status = 'suspended' THEN 'SUSPENDED'
    WHEN pr.status = 'active' THEN 'ELIGIBLE'
    ELSE 'PENDING_REGISTRATION'
  END AS federation_eligibility
FROM players p
LEFT JOIN clubs c ON c.id = p.current_club_id
LEFT JOIN player_registrations pr ON pr.player_id = p.id AND pr.status = 'active'
LEFT JOIN card_accumulations ca ON ca.player_id = p.id;

-- ==============================================================================
-- SUCCESS NOTICE:
-- Complete PostgreSQL schema, constraints, indexes, views, and seed data created!
-- ==============================================================================
