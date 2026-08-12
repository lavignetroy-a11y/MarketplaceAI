# Deploying

## Why a persistent server and not serverless

This app keeps three things in the memory of one long-lived Node process:

- **Campaign state** — `lib/campaign/store.ts` holds jobs in a `Map`.
- **The seller's uploaded photos** — they live in that same `Map` and are never written to disk or
  to a bucket. `lib/campaign/storage.ts` persists *generated* images, not source ones.
- **Generation itself** — `void runFullCampaign(id)` is started and the response returns
  immediately. A set of 8–30 images takes minutes to finish.

On a serverless platform each of those breaks, and breaks *invisibly*: everything works in
development, and the failure only appears once a stranger has paid. Instances do not share memory,
so a campaign created by one is a 404 to the next; the uploads that generation needs are in the
wrong instance; and the platform freezes the instance as soon as the response is sent, so the
background work never finishes. Vercel's function ceiling is 300 seconds even on paid plans, which
is shorter than a large set takes.

So: one persistent process, one replica. `railway.json` pins `numReplicas: 1`, and
`npm run preflight` fails if that is raised, because a second instance cannot see the first one's
campaigns. Scaling out is possible but is a real piece of work first — uploads to Supabase Storage,
job state in the database, generation on a queue.

## Railway

1. **New Project → Deploy from GitHub repo**, pick this repository and the branch you want live.
   Railway reads `railway.json`, builds with `npm run build`, starts with `npm run start`.

2. **Variables** — set these in the service's Variables tab. Railway injects `PORT`; Next.js reads
   it, so leave it alone.

   ```
   OPENAI_API_KEY
   STRIPE_SECRET_KEY
   STRIPE_WEBHOOK_SECRET
   NEXT_PUBLIC_SITE_URL
   NEXT_PUBLIC_SUPPORT_EMAIL
   NEXT_PUBLIC_ABUSE_EMAIL
   ```

   Optional, and worth having: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`. Without them the app runs fine but forgets every campaign when the
   service restarts, and restarts happen on every deploy.

   `SUPABASE_SERVICE_ROLE_KEY` must never carry a `NEXT_PUBLIC_` prefix — that ships it to every
   browser and it bypasses row-level security.

3. **Get the URL** — Settings → Networking → Generate Domain. Put that value in
   `NEXT_PUBLIC_SITE_URL` (with `https://`, no trailing slash) and redeploy. Stripe sends the buyer
   back to this address after checkout, so a wrong value strands them on a dead page holding a
   receipt.

4. **Register the webhook** — Stripe Dashboard → Developers → Webhooks → Add endpoint.

   - URL: `https://YOUR-RAILWAY-URL/api/stripe/webhook`
   - Event: `checkout.session.completed`

   Reveal the signing secret and set it as `STRIPE_WEBHOOK_SECRET`.

   This is **not** the secret `stripe listen` prints. That one belongs to the CLI tunnel and only
   verifies events the CLI forwards. Using it in production means every real webhook fails its
   signature check, campaigns are paid for and never generate, and nothing appears in the logs
   except a 400.

5. **Verify** — from a clone of the deployed environment's variables:

   ```
   npm run preflight
   ```

   Then run one real campaign end to end and watch the service logs for
   `POST /api/stripe/webhook` returning 200.

## Going from test to live

Swap `STRIPE_SECRET_KEY` for the live key, register a **second** webhook endpoint in live mode
(test and live have separate endpoint lists and separate signing secrets), and update
`STRIPE_WEBHOOK_SECRET` to the live one.

`npm run preflight` promotes the support and abuse addresses from warnings to blockers the moment
it sees a live key, because from that point a stranger can pay and needs somewhere to complain to.

## Restarts

Every deploy restarts the process and clears the in-memory `Map`. A campaign mid-generation is
lost. With Supabase configured the durable record survives, but the source photos do not, so the
set cannot resume. Deploy when nothing is running, or accept that anyone mid-set will need
regenerating by hand.
