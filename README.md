# Push-up Bros 💪

A responsive push-up challenge dashboard for friends: monthly leaderboard, daily workout logging, crew management and an SMS control panel.

## Stack
- React + TypeScript + Vite
- GitHub Pages deployment
- Supabase Auth + Postgres + Row Level Security
- Supabase Edge Function for server-side SMS sending

## Local preview
```bash
npm install
npm run dev
```
Without Supabase environment variables, the app runs in **local demo mode** using browser localStorage and sample crew data. Demo data is not shared between devices or friends.

## Supabase setup (shared accounts and data)
1. Create a free project at https://supabase.com/.
2. Open SQL Editor and run `supabase/schema.sql`.
3. In Authentication > URL Configuration, add your GitHub Pages URL to Site URL and Redirect URLs.
4. Copy the Project URL and anon/public key into GitHub repository Settings > Secrets and variables > Actions:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Sign up your account in the app. In Supabase SQL Editor, promote your account:
   `update public.profiles set role='admin' where id=(select id from auth.users where email='YOUR_EMAIL');`
6. Sign out and sign in again. Ask friends to sign up; their profiles are created automatically. Add/verify their Iranian phone numbers in the profiles table (E.164 format, e.g. +989121234567).

The anon key is intended for browser use; security comes from RLS. Never put the Supabase service-role key in Vite variables or the repository.

## GitHub Pages
1. Repository Settings > Pages > Build and deployment > Source: **GitHub Actions**.
2. Add the two Actions secrets above.
3. Push to `main`. The workflow builds and deploys automatically.
4. Site URL: https://ramtinvedadi.github.io/push-up-bros/

## SMS setup — important
There is no reliable unlimited free SMS service to Iranian mobile networks that this project can promise. Iranian SMS panel accounts commonly require purchased credit. The SMS Center is a UI/configuration placeholder; it deliberately does not send real SMS from the browser because that would expose your API token.

The secure Edge Function at `supabase/functions/send-sms/index.ts` is a generic starting adapter. Deploy it with:
```bash
supabase functions deploy send-sms
supabase secrets set SMS_API_URL="YOUR_PROVIDER_ENDPOINT" SMS_API_TOKEN="YOUR_TOKEN"
```
The example adapter sends JSON `{ "to": ["+989..."], "message": "..." }` and expects a provider compatible with that shape. Most Iranian panels use different endpoint, field names, authentication and sometimes GET/form-data; adapt the function to the panel's official API documentation before sending. Then update the SMS Center UI to invoke `supabase.functions.invoke('send-sms', { body: { phones, message } })` instead of browser fetch. Do not put the provider token into app settings or source control.

## Current scope
- Dashboard and monthly leaderboard are implemented.
- Daily reps/sets logging and member view are implemented.
- Local demo mode is available immediately.
- Supabase sign-in and database loading are wired; profile/entry policies are in SQL.
- SMS screen is a provider configuration UI; live delivery requires provider-specific adapter setup.
