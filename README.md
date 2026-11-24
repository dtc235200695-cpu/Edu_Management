# Learnwise — Learning Analytics Prototype

A Vietnamese learning dashboard prototype based on `tong_quan_trang_thai_de_tai_cloud_computing.md`. The code is split into `frontend/` and `backend/` npm workspaces, with root-level commands for common development tasks.

> **Prototype notice:** Dashboard and course activity are sample data. The ML page displays a model trained on synthetic records; the metrics are for demonstration only, and the prediction UI is not connected to this model. Do not use either for real learner assessments.

## Requirements

- Node.js 20 or newer
- npm
- Python 3.10 or newer (for ML demo artifacts)
- A Google OAuth 2.0 Web application client for Google sign-in

## Run locally

1. Install packages from the project root: `npm install`
2. Copy the root `.env.example` to `.env`.
3. Fill in the OAuth settings in that shared root `.env`; `VITE_API_BASE_URL=/api` is already set.
4. Configure `SESSION_SECRET` (at least 32 bytes), the Cloudflare Worker URL and shared secret, and the SMTP settings used to deliver temporary passwords and reset codes.
5. In Google Cloud Console, add the exact callback URI configured by `GOOGLE_REDIRECT_URI`. For local development, use `http://localhost:8787/auth/google/callback`.
6. Apply the D1 migrations and deploy the Worker as described below.
7. Start the API from the project root: `npm run server`
8. In a second terminal, start the UI from the project root: `npm run dev`
9. Open `http://localhost:5173`.

Demo credentials and role switching have been removed. The first admin signs in
with the verified Google account `hoanghai69205@gmail.com`. New Google accounts
are activated immediately with the student role. The primary admin account is
configured separately through `ADMIN_EMAIL`; administrators can later assign
other roles and unique student IDs.
Student IDs must be 3–30 characters using letters, numbers, `.`, `_`, or `-`;
passwords must be at least 8 characters.
Users can update their display name from the personal information page.
Account email, role, and student ID are read-only there and remain managed by
the authentication and administrator workflows. Existing accounts keep their
app-managed display name when they sign in with Google again.
For a single-process preview of a production build, run `npm run build` and
then `npm start`; open `http://localhost:8787`.

The Cloudflare status panel checks the deployed Worker, D1, and private R2
bucket. CSV imports are proxied through the backend to R2; files are not
currently indexed into D1. The bucket is private and uploads are limited to
10 MB. The ML Model page lists those imports; selecting a CSV evaluates its
Gaussian Naive Bayes risk classifier and, when `final_score` is present, its
Ridge regressor against a deterministic holdout. Model evaluation requires at
least five rows and the numeric columns
`attendance_rate`, `study_hours`, `assignment_score`, `quiz_score`,
`completion_rate`, and `previous_score`, plus either `final_score` or
`risk_level`. When `final_score` is absent, only classification metrics are
shown; the app does not invent regression targets. At most 5,000 rows are
evaluated. Only metrics are returned to the browser; the CSV remains private in
R2.

For another environment, set the same random `LEARNWISE_API_SECRET` in the
local `.env` and as a Wrangler Worker secret. Configure D1 migrations and
deploy the Worker from the repository root:

```bash
npx wrangler d1 migrations apply learnwise-db --remote
npx wrangler secret put LEARNWISE_API_SECRET
npx wrangler deploy
```

The Node API uses port `8787`; local Wrangler Worker development uses port
`8788` to avoid routing login requests to the Worker instead of the API.
Production Google sign-in requires an explicit HTTPS
`GOOGLE_REDIRECT_URI` ending in `/auth/google/callback`. Register that exact URI
in the Google OAuth client's authorized redirect URIs. The production API
prints its configured callback URI when it starts.

The authentication schema is in `cloudflare/migrations/0002_add_auth_and_roles.sql`.
Existing pending Google accounts are activated as students the next time they
sign in with Google. Suspended accounts stay suspended. The Worker uses
`ADMIN_EMAIL` if set; otherwise it uses `hoanghai69205@gmail.com`.

## Cloudflare Pages production

The Pages frontend and its Functions use `frontend/wrangler.jsonc` and
`frontend/functions/`. Build the frontend and test the Pages runtime locally
with `npm run build` and `npm run pages:dev`. The Pages Functions require the
configured D1 database and R2 bucket; apply pending migrations before deploying:

```powershell
npx wrangler d1 migrations apply learnwise-db --remote
npx wrangler pages project create eduinsight --production-branch main
npx wrangler pages secret put GOOGLE_CLIENT_ID --project-name eduinsight
npx wrangler pages secret put GOOGLE_CLIENT_SECRET --project-name eduinsight
npx wrangler pages secret put SESSION_SECRET --project-name eduinsight
npx wrangler pages secret put RESEND_API_KEY --project-name eduinsight
npm run deploy
```

`npm run deploy` builds the frontend and publishes it together with the Pages
Functions. Use this command after code changes to update the production site.
The first setup still requires applying migrations and configuring secrets.
For automatic deployments on pushes to `main`, the workflow applies pending
D1 migrations before deploying Pages. Add a Cloudflare API token with
Cloudflare Pages Edit and D1 Edit permissions as the GitHub repository Actions
secret `CLOUDFLARE_API_TOKEN`, and set the repository Actions variable
`CLOUDFLARE_ACCOUNT_ID`.

Set `MAIL_FROM` in the Pages production variables after its sender domain is
verified with Resend. Update the Google OAuth client's authorized redirect URI
to `https://eduinsight.pages.dev/auth/google/callback` before enabling sign-in.
Do not put any of the secret values in source control or chat.

The Pages dashboard, analytics, and student list use deterministic synthetic
demo records and display a DEMO warning; they are not real learner data and
must not be used for student assessment. The 60 seeded demo students have
four synthetic course records each, with 240 associated learning-path rows,
stored in D1 by migration `0006_seed_demo_scores_and_learning_paths.sql`.
Additional demo students can only be created with `DEMO-*` IDs and generated
demo names; they are stored separately in the D1 `demo_students` table. The
ML Model page computes per-file metrics from the selected R2 CSV; this is a
request-time evaluation, not a persisted model artifact. The prediction
endpoint still returns a labeled heuristic estimate, not the CSV model.
Learning-path completion statuses are stored in the D1
`demo_learning_path_status` table, created by migration
`0005_create_demo_learning_path_status.sql`. Real student IDs still receive an
unavailable response until an authorized dataset with validated topic results
has been integrated. Never present demo metrics, estimates, or paths as real
learner data.

Apply the pending D1 migrations before deploying the Pages Functions. The local
Node API proxies demo learning-path requests to the Cloudflare Worker, so
deploy the updated Worker with `npx wrangler deploy` when using that API.

## Generate the ML demo artifacts

Install the Python dependencies and train the demo models:

```bash
python -m pip install -r ml/requirements.txt
python ml/train_model.py
```

If `ml/student_learning_data.csv` does not exist, the training script creates
1,500 deterministic synthetic records. It saves regression/classification
models under `ml/artifacts/` and evaluation metrics to
`ml/model_metrics.json`. These artifacts are for the isolated local demo
pipeline; the ML Model page evaluates whichever CSV is selected in private R2.
Synthetic metrics are not evidence of real-world model performance.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret; server only |
| `GOOGLE_REDIRECT_URI` | OAuth callback URL; must match Google Console |
| `CLOUDFLARE_WORKER_URL` | Public `workers.dev` URL used for Worker/D1 health checks |
| `LEARNWISE_API_SECRET` | Shared backend/Worker secret for private D1 auth/user and R2 proxy routes |
| `SESSION_SECRET` | HS256 JWT signing key; use at least 32 random bytes (for example, `openssl rand -base64 32`) |
| `APP_URL` | UI origin for redirects after authentication |
| `PORT` | API and production server port |
| `COOKIE_SECURE` | Set to `true` when serving over HTTPS |
| `ADMIN_EMAIL` | Primary administrator Google account; defaults to `hoanghai69205@gmail.com` |
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASSWORD`, `MAIL_FROM` | SMTP connection for temporary-password and reset-code emails |
| `RESEND_API_KEY` | Resend API key used by Cloudflare Pages Functions |

Never commit `.env` or expose `GOOGLE_CLIENT_SECRET` or `SESSION_SECRET` in
frontend variables. Vite reads the same root `.env` file but only exposes
`VITE_*` variables to browser assets; keep secrets under their non-`VITE_`
names. `.env.example` contains placeholders only.

Update local backend settings only in the root `.env` (starting from
`.env.example`). The deployed Cloudflare Worker cannot load that file:
`LEARNWISE_API_SECRET` must also be configured as a Wrangler Worker secret, with
the same value as the backend setting. If `ADMIN_EMAIL` is changed from its
default, set the same value in the Worker environment.

## Current scope and next decisions

The implementation provides a front-end prototype and a modular Node
authentication/API server. Cloudflare Worker and D1 connectivity is verified
by a live health check, CSV files can be stored in private R2, but learner
records are not persisted to D1, and Queues and a Python Worker are not connected. The ML
Python artifacts are trained on generated synthetic data only; the selected-CSV
evaluation runs in the Worker and does not persist trained model files. The
prediction endpoint still uses a demo heuristic. The following items remain
open as described in the project overview:

- Replace synthetic records with an approved real dataset and re-evaluate the model.
- Recommendation rules and a production-compatible model inference runtime.
- Production session storage, deployment, logging, and operational controls.

Backend modules are separated into `routes/`, `middleware/`, and `services/`;
the Cloudflare Worker delegates health, user/auth, and storage operations to
separate modules. Passwords use scrypt hashes, login/reset endpoints are rate
limited, reset codes expire after ten minutes and lock after five invalid
attempts. Sessions are one-hour HS256 JWTs in `HttpOnly`, `SameSite=Lax`
cookies, with `Secure` enabled in production. Every authenticated request
checks the account's status and authorization version in D1; password resets,
role changes, and suspensions invalidate existing sessions. Configure HTTPS
and SMTP before production use. Logout expires the browser cookie; a copied
JWT can remain valid until its one-hour expiry unless a password or role change
increments the account authorization version.

Run focused backend auth tests with `npm test --workspace backend`.