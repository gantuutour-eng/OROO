CREATE TABLE IF NOT EXISTS journal (
 id TEXT PRIMARY KEY,
 request_key TEXT NOT NULL UNIQUE,
 request_hash TEXT NOT NULL,
 mutation_id TEXT NOT NULL,
 title TEXT NOT NULL DEFAULT '',
 excerpt TEXT NOT NULL DEFAULT '',
 category TEXT NOT NULL DEFAULT 'Зөвлөгөө',
 author TEXT NOT NULL DEFAULT 'Өрөө редакц',
 cover_id TEXT REFERENCES media(id),
 data TEXT NOT NULL CHECK(json_valid(data)),
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','archived')),
 featured INTEGER NOT NULL DEFAULT 1 CHECK(featured IN (0,1)),
 revision INTEGER NOT NULL DEFAULT 1,
 created_by TEXT NOT NULL REFERENCES users(id),
 updated_by TEXT NOT NULL REFERENCES users(id),
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 published_at TEXT
);
CREATE INDEX IF NOT EXISTS journal_public ON journal(status,featured,published_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS journal_admin ON journal(updated_at DESC,id DESC);
CREATE TABLE IF NOT EXISTS journal_media (
 journal_id TEXT NOT NULL REFERENCES journal(id),
 media_id TEXT NOT NULL UNIQUE REFERENCES media(id),
 position INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(journal_id,media_id)
);
CREATE TRIGGER IF NOT EXISTS journal_media_no_listing BEFORE INSERT ON journal_media
WHEN EXISTS(SELECT 1 FROM media WHERE id=new.media_id AND (listing_id IS NOT NULL OR expires_at=-1))
BEGIN SELECT RAISE(ABORT,'media_in_use'); END;
CREATE TRIGGER IF NOT EXISTS listing_media_no_journal BEFORE UPDATE OF listing_id ON media
WHEN new.listing_id IS NOT NULL AND (old.expires_at=-1 OR EXISTS(SELECT 1 FROM journal_media WHERE media_id=new.id))
BEGIN SELECT RAISE(ABORT,'media_in_use'); END;
INSERT OR IGNORE INTO app_meta(key,value) VALUES('journal_schema','1');
