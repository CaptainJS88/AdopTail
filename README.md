# Adoptail

A shelter and pet adoption website built with React, TypeScript, Vite, and Supabase.

## Run locally

You need Node.js and npm installed.

1. Clone the repository and open the project folder.

   ```sh
   git clone https://github.com/CaptainJS88/AdopTail.git
   cd AdopTail
   ```

2. Install dependencies.

   ```sh
   npm install
   ```

3. Create `.env.local` in the project root using the team's Supabase project URL and publishable key. Keep this file local.

   ```env
   VITE_SUPABASE_URL=your_project_url
   VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
   ```

4. Start the app and open the local address shown in the terminal.

   ```sh
   npm run dev
   ```

## Database setup

Use the team’s Supabase project. Database changes are in `supabase/migrations`. The backend team should apply any pending migrations before testing applications and visits. Staff accounts need an approved staff role.

## Build

```sh
npm run build
```
