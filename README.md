# Hum Safar

Carpooling for Hyderabad and beyond. Drivers post rides, riders request seats, everyone splits the fuel cost.
No payments in this version (cash/UPI directly to the driver, zero commission).

**Stack:** React + Vite (installable PWA, Android-ready) · Supabase (Postgres + PostGIS, Auth, Realtime) ·
OpenStreetMap Nominatim (places) · OSRM (routes). All free tiers, no paid infrastructure.

## 1. Run it

```bash
npm install
cp .env.example .env     # already filled with your Supabase URL + publishable key
npm run dev              # http://localhost:5173
```
Open `/?demo=1` to try the UI with sample data and no backend.

## 2. Database (already applied to your project)
`supabase/schema.sql` is the full schema: tables, row-level security, seat accounting triggers,
PostGIS route search, chat and ratings. To rebuild elsewhere, paste it into the Supabase SQL editor.

**One dashboard setting to change:** Authentication → Sign In / Providers → Email → turn **"Confirm email" OFF**
so people can sign up instantly. (Supabase's built-in email sender is limited to a few emails per hour.
Turn confirmation back on later when you add your own SMTP.)

## 3. Put it on a phone (free)
**Fastest: installable web app.** Deploy the `dist` folder to Cloudflare Pages / Netlify / Vercel (all free):
```bash
npm run build
```
Add env vars `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the host's settings. Open the URL in Chrome on
Android → menu → **Install app**. It runs full-screen with its own icon.

**APK without Android Studio (GitHub Actions, free).** Create a GitHub repo, upload this project (the `.github/workflows/android.yml`
file builds the APK automatically). Open the repo's **Actions** tab → *Build Android APK* → **Run workflow**. After ~5 minutes
download **HumSafar-APK** from the run, unzip it, and install `app-debug.apk` on your phone (allow "Install unknown apps" once).

**Real APK / Play Store (Capacitor).** Needs Android Studio on your computer:
```bash
npm i @capacitor/core @capacitor/cli @capacitor/android
npx cap add android
npm run build && npx cap sync android
npx cap open android      # Build > Build APK(s), or Generate Signed Bundle for Play Store
```
Play Store needs a one-time $25 developer account.

## How ride matching works
Each ride stores its driving route (from OSRM) as a PostGIS line. A rider's search matches when both their pickup
and drop-off are within 12 km of the route **and** the pickup comes before the drop-off along it. So a rider in
Gachibowli can join a Hyderabad → Bangalore ride, and rides never match in the wrong direction.

## Limits to know about
* Free Supabase projects pause after a week of inactivity; Nominatim and the OSRM demo server are fair-use only
  (fine for a pilot; self-host or switch to a paid tier when you grow).
* Add phone/ID verification and a report button before opening to the public.
* Check local rules on ride-sharing. Keep it strictly cost-sharing.
