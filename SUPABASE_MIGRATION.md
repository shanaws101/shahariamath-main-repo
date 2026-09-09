# Supabase Migration Runbook - Shaharia Math

Target project: `nxibbfgryrmspzgueeej` (`https://nxibbfgryrmspzgueeej.supabase.co`).

## Repository Configuration

- Frontend Supabase project ID, URL, publishable anon key, and service role key are configured in `.env`.
- Supabase CLI config points to `nxibbfgryrmspzgueeej` in `supabase/config.toml`.
- Static preconnect/dns-prefetch tags point to `https://nxibbfgryrmspzgueeej.supabase.co` in `index.html`.
- Capacitor configured with `com.shahariamath.app` in `capacitor.config.ts`.
- Student ID generator configured with prefix `SMC-` in `supabase/migrations/20260909000000_change_student_id_prefix_to_smc.sql`.

## Database Deployment Options

### Option 1: Supabase Dashboard SQL Editor (Recommended & Instant)
1. Open the Supabase Dashboard for project `nxibbfgryrmspzgueeej`: https://supabase.com/dashboard/project/nxibbfgryrmspzgueeej/sql
2. Copy the contents of `supabase/combined_migrations_for_new_project.sql`.
3. Paste into the SQL Editor and click **Run**.
4. All tables (`profiles`, `subjects`, `enrollments`, `pdf_suggestions`, `payments`, `user_sessions`, `student_id_counter`, etc.), custom enums, RLS policies, triggers, and functions will be created.

### Option 2: Supabase CLI
```bash
supabase login
supabase link --project-ref nxibbfgryrmspzgueeej
supabase db push
```

## Edge Function Deployment
```bash
supabase functions deploy ai-writer
supabase functions deploy bkash-payment --no-verify-jwt
supabase functions deploy claim-referral
supabase functions deploy cloudflare-analytics
supabase functions deploy create-employee-account
supabase functions deploy delete-employee
supabase functions deploy invite-employee
supabase functions deploy livekit-token
supabase functions deploy process-scheduled-sms
supabase functions deploy referral-finalize
supabase functions deploy referral-slug-check
supabase functions deploy request-redemption
supabase functions deploy send-campaign-sms
supabase functions deploy send-otp
```
