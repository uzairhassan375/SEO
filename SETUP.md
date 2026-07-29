# Zambeel SEO — Setup

## 1. Environment

Copy `.env.example` to `.env` and add your Supabase URL and publishable key.

## 2. Supabase Auth users

In **Supabase Dashboard → Authentication → Users**, create 3 users:

| Email | Role | Assigned service |
|-------|------|------------------|
| admin@zambeel.com | admin | — |
| member1@zambeel.com | member | dropshipping |
| member2@zambeel.com | member | 3pl |

(Add a third member for `360` if needed.)

Profiles are auto-created on signup. Then in **Table Editor → profiles**, set:

- `role`: `admin` or `member`
- `assigned_service`: `dropshipping`, `3pl`, or `360`
- `full_name`: display name

**Note:** `admin@zambeel.com` is always treated as admin in the app.

## 3. Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

## 4. Deploy on Vercel

In **Vercel → Project → Settings → Environment Variables**, add (Production, Preview, and Development):

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Your Supabase anon/publishable key |

Redeploy after saving. Without these, `npm run build` fails during page generation.

## 5. How to use reports (simple guide)

| Page | When | Who | What you do |
|------|------|-----|-------------|
| **Dashboard** | Any day | Everyone | See live totals — no form to fill |
| **Weekly Report** | End of each week | Members submit; admin reviews | Numbers are filled in automatically from the member's own work — review, add notes, submit |
| **Monthly Report** | End of month | Admin only | Enter month-end totals per service + comments; export PDF |

**Weekly:** One report per service per week. A member's numbers are derived from what they logged in the app for that week (`useWeeklyMetrics`), not typed in:

| Metric | Source |
|---|---|
| Backlinks added | `backlinks` they added that week, type `backlink` |
| Guest posts | `backlinks` they added that week, type `guest_post` |
| Blogs published | their `blogs` at status published/live dated in that week |
| Keywords improved | `activity_log` keyword updates that week where the rank got better |
| On-page fixes | `page_rankings` rows they entered for that week |

Only Notes are typed. Admin still has the manual "Add / edit report" form to correct a service report.

**Monthly:** Admin enters rolled-up numbers (may differ from dashboard). Member table shows app activity that month, not weekly form data.

## 6. Database

Schema and RLS are applied via Supabase. Tables: `profiles`, `keywords`, `page_rankings`, `backlinks`, `blogs`, `weekly_reports`, `monthly_reports`, `activity_log`, `announcements`, `announcement_recipients`.

**Admin user management:** Settings → Team Management lists every user. Admins can set a user's password and delete a user. Both go through `/api/admin/users`, which verifies the caller is an admin and then uses the Supabase Admin API — so `SUPABASE_SERVICE_ROLE_KEY` must be set in `.env` locally and in the Vercel project env vars (Project Settings → API → `service_role` secret). Never expose that key to the browser. The primary admin (`admin@zambeel.com`) cannot be deleted, and nobody can delete their own account.

**Announcements:** admin-only "Announce" button in the top bar. Pick members, write a description, send. Each selected member gets it as a popup that keeps appearing until they click "Okay, got it" — which marks it read, and the admin sees a green ✓ chip with their name in the same dialog (live). **Resend** clears everyone's acknowledgement so it pops up again, pushed live over realtime — no reload or re-login needed. The eye toggle stops it entirely; the bin deletes it. Apply `supabase/migrations/20260729120000_announcements.sql` and `20260729130000_announcement_acknowledge.sql` before using it.

> The Tasks feature was removed from the UI. The `tasks` table is still in the database (untouched) but nothing reads or writes it.

**Keywords:** `rank_week1`–`rank_week4`, matching `impressions_week1`–`impressions_week4`, plus `current_rank`.

**Pages:** `page_rankings` — `page_url`, `clicks`, `impressions`, `avg_position`, `ctr`, `service`, `week_number`, `year` (members see/edit their service only; admin sees all).
