# MyFiftyTaste Web

Local V0 frontend for displaying a generated MyFiftyTaste profile.

## Setup

```bash
npm install
```

## Refresh sample data

The V0 reads a static JSON sample from `public/sample/`.

```bash
npm run copy:sample
```

This copies:

```text
../data/output/tanguytare_display_profile.json
```

to:

```text
public/sample/tanguytare_display_profile.json
```

## Run locally

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

## Current limitations

- The profile is static and bundled from `public/sample/tanguytare_display_profile.json`.
- There is no API, routing by username, authentication, or Vercel deployment yet.
- The UI is a first local showcase, not a final product design system.
