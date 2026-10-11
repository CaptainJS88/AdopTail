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

- `src/App.tsx`: the landing page sections.
- `src/components/Header.tsx`: the navigation and mobile menu.
- `src/components/PetCard.tsx`: one pet preview, reused for each sample pet.
- `src/data/pets.ts`: sample pets; these are not database records.
- `src/styles.css`: colors, spacing, and responsive layouts.
- `public/adoptail-logo.svg`: the supplied logo with a tighter viewing area.

This first version is a landing page only. Navigation links move to sections on the page. Authentication, pet browsing, applications, and the backend connection will be added separately.

The landing page uses the team's logo and text-only sample pet previews. There are no animal photos in this version.
