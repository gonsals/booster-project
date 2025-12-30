# Astro with Tailwind

```sh
pnpm create astro@latest -- --template with-tailwindcss
```

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/withastro/astro/tree/latest/examples/with-tailwindcss)
[![Open with CodeSandbox](https://assets.codesandbox.io/github/button-edit-lime.svg)](https://codesandbox.io/p/sandbox/github/withastro/astro/tree/latest/examples/with-tailwindcss)
[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/withastro/astro?devcontainer_path=.devcontainer/with-tailwindcss/devcontainer.json)

Astro comes with [Tailwind](https://tailwindcss.com) support out of the box. This example showcases how to style your Astro project with Tailwind.

For complete setup instructions, please see our [Tailwind Integration Guide](https://docs.astro.build/en/guides/integrations-guide/tailwind).

## Fetch MTG boosters (MTGJSON)

The app now fetches booster names on-demand from MTGJSON (`https://mtgjson.com/api/v5/SetList.json`) using a server-side paginated endpoint, so you do **not** need to run a prefetch script for the site to work in development.

If you prefer to prefetch and persist data for offline builds, a helper script is still available (`npm run fetch-boosters`) but it is optional — the server endpoints will query MTGJSON live when needed.

Examples:

```bash
# optional: prefetch and save data locally
npm run fetch-boosters

# start dev server (no prefetch required)
npm run dev
```
