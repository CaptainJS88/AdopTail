# Adoptail
Software Engineering course project featuring a pet adoption website.

## Frontend setup

The frontend uses React, TypeScript, and Vite.

```sh
npm install
npm run dev
```

Open the local address shown in the terminal. To check TypeScript and create a production build, run `npm run build`.

## Files

- `src/App.tsx`: the shared header and page routes.
- `src/pages/Home.tsx`: the landing page sections.
- `src/pages/FindPet.tsx`, `AdoptPet.tsx`, and `ScheduleVisit.tsx`: pet search, adoption search, and visit selection.
- `src/components/Header.tsx`: the navigation and mobile menu.
- `src/components/PetCard.tsx`: one pet preview, reused for each sample pet.
- `src/data/pets.ts`: sample pets; these are not database records.
- `src/styles.css`: colors, spacing, and responsive layouts.
- `public/adoptail-logo.svg`: the logo.

## Pages

One `index.html` and `src/main.tsx` load the React app. React Router shows the page for `/`, `/pets`, `/adopt`, or `/visit` without separate HTML entry files. The header's section links return to the homepage.

Pet searches use sample data. On `/pets`, each Apply button opens `/adopt?pet=ID` for that pet. Completing the demo form leads to `/visit?pet=ID` to preview a preferred visit date and time. Application details stay in React state while navigating and clear on refresh; nothing is submitted or booked. Form fields are provisional until the team agrees on backend integration.
