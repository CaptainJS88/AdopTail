# Adoptail

An animal shelter and adoption management website built with React, TypeScript, Vite and Supabase.

## Requirements

- Node.js 22 and npm
- Internet access and the team's configured Supabase project

## Run locally

1. Extract the project folder and open it in a terminal.
2. Install dependencies.

   ```sh
   npm ci
   ```

3. Copy `.env.example` to `.env.local` and enter the project's Supabase URL and publishable key.

   ```sh
   cp .env.example .env.local
   ```

   Use the configuration supplied with the private submission. Keep login details and `.env.local` out of GitHub.

4. Start the website and open the address shown in the terminal.

   ```sh
   npm run dev
   ```

## Using the website

Demo account details and Supabase configuration are provided in `DEMO_ACCESS.txt` with the private submission.

Sign in through **My account** using the adopter or approved staff account.

- Adopters can search pets, view details, update their profile, submit applications and request visits.
- **My applications** and **My visits** show saved decisions, rejection reasons and confirmed times.
- Approved staff can manage pets and medical records, review applications and manage visits.
- Submitted applications appear under **Applications** for review. Approval does not complete an adoption.
- After the pet goes home, staff select **Record completed adoption** and confirm. The record then appears under **Completed adoptions**, and the pet is marked adopted.

The website runs locally and uses the connected Supabase database. Changes made through the website are saved there.

## Build

```sh
npm run build
```

This checks TypeScript and creates the production files in `dist`.

## Tests

### Browser tests

```sh
npx playwright install chromium
npm run test:e2e
```

Tests start a local server on port 4174 and print results in the terminal. They use simulated Supabase responses to check browser behavior without changing live data.

### Database tests

SQL tests are in `supabase/tests/database`. With Docker and a configured local Supabase test database running, use:

```sh
npx supabase test db
```

These tests check permissions and workflow rules inside transactions that are rolled back. Do not reset the shared database to run them.

## Project folders

- `src`: pages, components, validation and data requests
- `public`: logo and images
- `tests/e2e`: browser tests
- `supabase/migrations`: database schema and workflow functions
- `supabase/tests/database`: database tests

## Troubleshooting

- If localhost is unavailable, run `npm run dev` and use the address printed.
- If data or sign in fails, check the internet connection and `.env.local`, then restart the server.
- Staff access requires an approved staff account.
