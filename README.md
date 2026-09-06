<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/ece08d40-b51a-4187-bac8-c4fd081a5505

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy to Vercel

This is a static Vite/React app — no server, no environment variables required to
run it today (all data lives in the browser's `localStorage`). `vercel.json` is
already configured with the build command and output directory.

**Option A — Vercel CLI, no Git needed:**
```
npm install -g vercel
vercel        # first deploy, follow the prompts
vercel --prod # promote to production
```

**Option B — GitHub import:**
1. Push this folder to a GitHub repository (`git init && git add . && git commit -m "init" && git push`).
2. In the Vercel dashboard, "Add New… > Project", import that repository.
3. Vercel auto-detects the Vite framework from `vercel.json` — no extra config needed.

## Login accounts

There is no self-signup screen anywhere in the app. The owner account
(`antunescosta.gustavo@gmail.com`) is the only one that can log in out of the box,
and it is the only one that can create seller accounts, from inside the app
(Vendedores > Novo Vendedor). See `src/services/supabase_bootstrap_owner.sql` for
how to set up that same owner account once you migrate from local storage to a
real Supabase project.
