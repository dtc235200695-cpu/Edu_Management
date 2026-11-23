# Learnwise — Learning Analytics Prototype

A Vietnamese learning dashboard prototype based on `tong_quan_trang_thai_de_tai_cloud_computing.md`. The code is split into `frontend/` and `backend/` npm workspaces, with root-level commands for common development tasks.

> **Prototype notice:** Dashboard figures and course activity are sample data. Predictions and recommendations are not produced by a trained machine-learning model and must not be presented as real learner assessments.

## Requirements

- Node.js 20 or newer
- npm
- A Google OAuth 2.0 Web application client for Google sign-in

## Run locally

1. Install packages from the project root: `npm install`
2. Copy the root `.env.example` to `.env`.
3. Fill in the OAuth settings in that shared root `.env`; `VITE_API_BASE_URL=/api` is already set.
4. In Google Cloud Console, add this exact authorized redirect URI: `http://localhost:8787/auth/google/callback`
5. Start the API from the project root: `npm run server`
6. In a second terminal, start the UI from the project root: `npm run dev`
7. Open `http://localhost:5173`.

The demo is available without Google credentials using **Xem bản demo**.
For a single-process preview of a production build, run `npm run build` and
then `npm start`; open `http://localhost:8787`.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret; server only |
| `GOOGLE_REDIRECT_URI` | OAuth callback URL; must match Google Console |
| `SESSION_SECRET` | HS256 JWT signing key; use at least 32 random bytes (for example, `openssl rand -base64 32`) |
| `APP_URL` | UI origin for redirects after authentication |
| `PORT` | API and production server port |
| `COOKIE_SECURE` | Set to `true` when serving over HTTPS |

Never commit `.env` or expose `GOOGLE_CLIENT_SECRET` or `SESSION_SECRET` in
frontend variables. Vite reads the same root `.env` file but only exposes
`VITE_*` variables to browser assets; keep secrets under their non-`VITE_`
names. `.env.example` contains placeholders only.

## Current scope and next decisions

The implementation provides a front-end prototype and a small Node OAuth/API
server. It does not yet persist learner records or connect to Cloudflare D1,
R2, Queues, or a Python Worker. The following items remain open as described
in the project overview:

- Target learner group, roles, and the final learning-product scope.
- D1 schema and data collection/retention rules.
- Dataset, prediction target, trained model, and evaluation metrics.
- Recommendation rules and a production-compatible model inference runtime.
- Production session storage, deployment, logging, and operational controls.

Google sign-in validates the OAuth state, ID-token signature/audience/nonce,
and verified email. The backend issues a one-hour HS256 JWT session cookie and
a ten-minute JWT OAuth-state cookie with separate audiences. Cookies are
`HttpOnly`, `SameSite=Lax`, and `Secure` when `COOKIE_SECURE=true`; logout
checks the request origin and expires both cookies. Enable HTTPS and
`COOKIE_SECURE=true` in production. JWTs are stateless: clearing the browser
cookie signs out that browser, but a stolen JWT remains usable until its
one-hour expiry; immediate revocation requires a persistent session/revocation
store, which is not yet connected in this prototype.