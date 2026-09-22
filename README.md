# Lupa Academy

A clinic onboarding CRM for [Lupa](https://lupapets.com/us/) deployments.

Deployments fail when clinic staff don't know the new workflow. Lupa Academy fixes the handoff:

- **Clinic-facing: Lupa Academy.** Each staff member gets a learning path for their role (vet, tech, front desk or practice manager). Every module starts from the workflow they know in their old PIMS (Cornerstone, ezyVet, AVImark) and shows the Lupa way. After a short lesson comes a scored knowledge check, then a hands-on simulation of Lupa. The next module stays locked until they pass. Every module has a due date, and overdue work is visible to the learner, their manager and Lupa.
- **Lupa-facing: Deployment Console.** Readiness by clinic, role and person against the pace needed for go-live. It also has a live activity feed, a skill matrix ("who knows what"), go-live benchmarks, the most-missed workflow steps, per-attempt mistake detail, reminders with read receipts, module assignment, recertification and a touchpoint log.
- **Presenter mode.** Both views side by side, sharing one live store, with a step-by-step demo script.

Clinics move through Lupa's own migration phases: **Scoping → Configuration → Training → Go-live → Hypercare**. Lupa Academy powers the Training phase, and its benchmarks decide when a clinic is ready for go-live. The UI follows lupapets.com: violet and aubergine palette, Satoshi and Geist type, pill buttons, and the product's dark top bar. There's a light/dark/system theme toggle in every header.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # scoring, readiness metrics, and a check that every simulation is completable
npm run build    # static site in dist/
```

## Deploy

It's a static site with no backend or environment variables.

- **Vercel:** import the repo. The framework preset is Vite, the build command is `npm run build`, and the output directory is `dist`.
- **Netlify / Cloudflare Pages / GitHub Pages:** use the same build command and output directory.
- **Single file:** `SINGLE_FILE=1 npm run build` inlines everything into `dist/index.html`.

Routing is hash-based (`#/team`, `#/learn`, `#/present`), so no rewrite rules are needed.

## Suggested demo flow (Presenter mode)

1. Riverside goes live in 9 days. Jess (front desk) hasn't started, so she's flagged as at risk.
2. In the console, send Jess a reminder. It appears on her screen instantly. She marks it read, and the console records the receipt.
3. Jess starts *Lupa Fundamentals*: the Cornerstone workflow next to the Lupa way, then the lesson and the gated quiz.
4. In the simulation, make one wrong move. The console logs it live.
5. She finishes and gets certified. Readiness, the skill matrix and the benchmarks update in real time.
6. **Insights** shows where the clinic struggles. Dr. Patel's profile shows exactly which step he failed.

The ⚡ button on a clinic simulates staff activity, so the dashboard moves even when nobody is training.

## How it works

| Piece | Where |
| --- | --- |
| Curriculum: 13 modules with old/new workflows, lessons, quizzes and simulation scripts | `src/content/modules.ts` |
| Scoring: quiz 30% + simulation 70%, −8 per wrong move, −12 per hint | `src/logic/scoring.ts` |
| Readiness, pace, status, benchmarks, insights | `src/logic/metrics.ts` |
| Local-first store synced live across panes and tabs (BroadcastChannel) | `src/store.ts` |
| Demo data: 4 clinics, 33 staff | `src/data/seed.ts` |

Data lives in each visitor's browser, so everyone who opens the link gets their own sandbox. Use **Reset demo data** to start over. To make it multi-user, swap the `commit`/`BroadcastChannel` layer in `src/store.ts` for an API or a realtime database. The rest of the app only uses `useAppState()` and `actions`.

The deployment specialist's name is set in `SPECIALIST` in `src/data/seed.ts`.
