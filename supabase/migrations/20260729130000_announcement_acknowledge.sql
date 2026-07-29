-- Announcements are acknowledged, not shown forever.
-- The popup appears until the member clicks "Got it"; admin can Resend to make
-- it pop up again (which clears the acknowledgement).

ALTER TABLE public.announcement_recipients
  ADD COLUMN IF NOT EXISTS acknowledged_at timestamptz;

CREATE INDEX IF NOT EXISTS announcement_recipients_pending_idx
  ON public.announcement_recipients (user_id)
  WHERE acknowledged_at IS NULL;

-- realtime push so a resend reaches the member without waiting for a reload
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.announcement_recipients;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
