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
- `src/data/pets.ts`: loads visible pets and shared medical records from Supabase.
- `src/pages/PetDetails.tsx`: pet descriptions, care needs, and shared medical information.
- `src/styles.css`: colors, spacing, and responsive layouts.
- `public/adoptail-logo.svg`: the logo.

## Pages

One `index.html` and `src/main.tsx` load the React app. React Router shows the page for `/`, `/pets`, `/adopt`, or `/visit` without separate HTML entry files. The header's section links return to the homepage.

Pet searches use live Supabase listings. Text search can be combined with species, breed, age, and availability filters. View details opens `/pets/ID` with the pet's description and care needs. Signed-in users can also read medical records marked visible to adopters.

Apply opens `/adopt?pet=ID` for the selected pet. Signed-in adopters can submit an application and view its status at `/applications`. Visit requests use `/visit?pet=ID` and need shelter confirmation. Local development needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in an ignored `.env.local` file.
