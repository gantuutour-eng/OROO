PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT OR IGNORE INTO app_meta(key,value) VALUES ('schema_version','1'),('public_version','1');

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name TEXT NOT NULL,
  password_hash TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user','moderator','admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','blocked','closed','pending_setup')),
  email_verified INTEGER NOT NULL DEFAULT 0,
  setup_nonce TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  csrf_token TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
CREATE TABLE IF NOT EXISTS admin_bootstrap (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  expires_at INTEGER NOT NULL,
  consumed_at INTEGER
);
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT NOT NULL,
  window INTEGER NOT NULL,
  counter INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY(key,window)
);
CREATE INDEX IF NOT EXISTS rates_expiry ON rate_limits(window);

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL UNIQUE REFERENCES users(id),
  name TEXT NOT NULL,
  data TEXT NOT NULL CHECK(json_valid(data)),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','first_review','approved','rejected','suspended')),
  revision INTEGER NOT NULL DEFAULT 1,
  first_reviewer TEXT REFERENCES users(id),
  final_reviewer TEXT REFERENCES users(id),
  first_review TEXT CHECK(first_review IS NULL OR json_valid(first_review)),
  final_review TEXT CHECK(final_review IS NULL OR json_valid(final_review)),
  verified_until TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS organizations_status ON organizations(status,updated_at DESC);

CREATE TABLE IF NOT EXISTS listings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id TEXT NOT NULL REFERENCES users(id),
  organization_id TEXT REFERENCES organizations(id),
  request_key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  mutation_id TEXT NOT NULL,
  type INTEGER NOT NULL CHECK(type BETWEEN 0 AND 4),
  province TEXT NOT NULL,
  area TEXT NOT NULL,
  khoroo TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude REAL NOT NULL CHECK(latitude BETWEEN 41 AND 53),
  longitude REAL NOT NULL CHECK(longitude BETWEEN 87 AND 120),
  deal TEXT NOT NULL CHECK(deal IN ('rent','sale')),
  price REAL CHECK(price >= 0),
  rent_period TEXT NOT NULL,
  size REAL NOT NULL CHECK(size > 0),
  floor INTEGER,
  rooms TEXT,
  year INTEGER,
  data TEXT NOT NULL CHECK(json_valid(data)),
  state TEXT NOT NULL DEFAULT 'published' CHECK(state IN ('draft','published','hidden','closed','deleted')),
  moderation TEXT NOT NULL DEFAULT 'pending' CHECK(moderation IN ('pending','approved','rejected','suspended')),
  review_reason TEXT NOT NULL DEFAULT '',
  revision INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(owner_id,request_key)
);
CREATE INDEX IF NOT EXISTS listings_public_new ON listings(moderation,state,created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS listings_public_region ON listings(moderation,state,province,area,khoroo,type,created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS listings_public_price ON listings(moderation,state,deal,type,price,id);
CREATE INDEX IF NOT EXISTS listings_public_map ON listings(moderation,state,latitude,longitude,id);
CREATE INDEX IF NOT EXISTS listings_owner ON listings(owner_id,updated_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS listings_org ON listings(organization_id,moderation,state,created_at DESC,id DESC);
CREATE VIRTUAL TABLE IF NOT EXISTS listing_search USING fts5(name,address,area,content='listings',content_rowid='id',tokenize='unicode61');
CREATE TRIGGER IF NOT EXISTS listings_search_insert AFTER INSERT ON listings BEGIN
  INSERT INTO listing_search(rowid,name,address,area) VALUES(new.id,new.name,new.address,new.area);
END;
CREATE TRIGGER IF NOT EXISTS listings_search_update AFTER UPDATE OF name,address,area ON listings BEGIN
  INSERT INTO listing_search(listing_search,rowid,name,address,area) VALUES('delete',old.id,old.name,old.address,old.area);
  INSERT INTO listing_search(rowid,name,address,area) VALUES(new.id,new.name,new.address,new.area);
END;

CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id),
  listing_id INTEGER REFERENCES listings(id),
  request_key TEXT NOT NULL,
  full_key TEXT NOT NULL UNIQUE,
  thumb_key TEXT NOT NULL UNIQUE,
  full_ready INTEGER NOT NULL DEFAULT 0,
  thumb_ready INTEGER NOT NULL DEFAULT 0,
  full_size INTEGER NOT NULL DEFAULT 0,
  thumb_size INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  UNIQUE(owner_id,request_key)
);
CREATE INDEX IF NOT EXISTS media_listing ON media(listing_id,position,id);
CREATE INDEX IF NOT EXISTS media_owner ON media(owner_id,created_at DESC);
CREATE INDEX IF NOT EXISTS media_orphans ON media(listing_id,expires_at);
CREATE TRIGGER IF NOT EXISTS media_no_reassign BEFORE UPDATE OF listing_id ON media
WHEN old.listing_id IS NOT NULL AND new.listing_id IS NOT NULL AND old.listing_id<>new.listing_id
BEGIN SELECT RAISE(ABORT,'photo_already_attached'); END;

CREATE TABLE IF NOT EXISTS favorites (
  user_id TEXT NOT NULL REFERENCES users(id),
  listing_id INTEGER NOT NULL REFERENCES listings(id),
  created_at TEXT NOT NULL,
  PRIMARY KEY(user_id,listing_id)
);
CREATE TABLE IF NOT EXISTS records (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK(kind IN ('clients','consultations','schedules','contracts','ledger','groups','campaigns','inquiries','reports','support','posts','notices')),
  owner_id TEXT NOT NULL REFERENCES users(id),
  organization_id TEXT REFERENCES organizations(id),
  listing_id INTEGER REFERENCES listings(id),
  province TEXT NOT NULL DEFAULT '',
  area TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  data TEXT NOT NULL CHECK(json_valid(data)),
  revision INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS records_owner ON records(owner_id,kind,created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS records_org ON records(organization_id,kind,created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS records_listing ON records(listing_id,kind,created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS records_public ON records(kind,status,province,area,created_at DESC,id DESC);
CREATE TABLE IF NOT EXISTS audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id TEXT REFERENCES users(id),
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  detail TEXT NOT NULL,
  request_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS audit_created ON audit(created_at DESC,id DESC);
CREATE TRIGGER IF NOT EXISTS audit_no_update BEFORE UPDATE ON audit BEGIN SELECT RAISE(ABORT,'audit_is_append_only'); END;
CREATE TRIGGER IF NOT EXISTS audit_no_delete BEFORE DELETE ON audit BEGIN SELECT RAISE(ABORT,'audit_is_append_only'); END;
