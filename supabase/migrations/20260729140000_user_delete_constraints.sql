-- Fix: "Database error deleting user".
--
-- Supabase's admin delete-user call fails when any row still points at the auth
-- user (or at their profile) through a foreign key that has no ON DELETE action.
-- Every keyword, link, blog, report and activity row a member created is exactly
-- that kind of reference, so deleting a member was always blocked.
--
-- After this migration:
--   profiles.id                       → auth.users(id)     ON DELETE CASCADE
--   announcement_recipients.user_id   → profiles(id)       ON DELETE CASCADE
--   every other owner column          → ON DELETE SET NULL
--
-- SET NULL keeps the historical rows (a deleted member's backlinks and blogs stay
-- in the reports, just without an owner) instead of deleting their work with them.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT
      c.conname,
      c.conrelid::regclass AS tbl,
      c.conrelid::regclass::text AS tbl_name,
      a.attname AS col,
      c.confrelid::regclass AS ref
    FROM pg_constraint c
    JOIN unnest(c.conkey) AS k(attnum) ON true
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
    WHERE c.contype = 'f'
      AND c.connamespace = 'public'::regnamespace
      AND c.confrelid IN ('public.profiles'::regclass, 'auth.users'::regclass)
      AND array_length(c.conkey, 1) = 1
  LOOP
    IF (r.tbl_name = 'profiles' AND r.col = 'id')
       OR r.tbl_name = 'announcement_recipients' THEN
      EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.conname);
      EXECUTE format(
        'ALTER TABLE %s ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %s(id) ON DELETE CASCADE',
        r.tbl, r.conname, r.col, r.ref
      );
      RAISE NOTICE 'CASCADE: %.%', r.tbl_name, r.col;
    ELSE
      -- owner columns must be nullable for SET NULL to be legal
      EXECUTE format('ALTER TABLE %s ALTER COLUMN %I DROP NOT NULL', r.tbl, r.col);
      EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.conname);
      EXECUTE format(
        'ALTER TABLE %s ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %s(id) ON DELETE SET NULL',
        r.tbl, r.conname, r.col, r.ref
      );
      RAISE NOTICE 'SET NULL: %.%', r.tbl_name, r.col;
    END IF;
  END LOOP;
END $$;
