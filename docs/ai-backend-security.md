# Authenticated AI backend

Status: implemented on a review branch; production rollout is not approved or verified.

## Request flow

Browser Firebase ID token -> same-origin POST /api/ai -> Admin SDK verifies signature,
project, expiry and revocation -> operation validation -> atomic quota reservation
in the named `ai-security` Firestore database -> Gemini -> bounded response.
Anonymous identities are rejected. Firebase web configuration is public; Gemini
credentials exist only in the backend. The browser cannot choose provider URLs,
models, system instructions or output limits.

## Limits and behavior

60 units/user/minute, 200/user/day and 2,000/app/day, UTC fixed windows. A normal
request costs one unit; images cost three, Maven attachments add three each,
and Synapse reserves each chunk/extraction/embedding plus synthesis/validation call.
Failed provider requests still consume their reservation. These are usage ceilings,
not dollar budgets. Configure provider spending controls separately and use a
separate restricted Gemini credential per application. Global limits also bound
abuse from newly created accounts, at the cost of shared availability.

Request body: 3 MiB; attachment: 1 MB decoded, permitted types only. Stream output
is capped at 64,000 characters; generation uses server-selected output token limits.
Requests time out after 55 seconds and propagate cancellation on disconnect.
Transcripts are limited to 12,000 characters with two concurrent chunk calls.
Maven retains the last 12 text messages as model context; prior attachments are
not resent. Static-hosting-only deployments no longer provide AI functionality.

## Required configuration before rollout

1. Confirm the intended Firebase project, region, hosting site and billing. Do not
   run a bare `firebase deploy`. Functions require Blaze billing. No billing changes,
   production writes, rules deployment or key rotation are performed by this PR.
2. Provision a separate Firestore database named `ai-security`. Apply
   `firestore.ai.rules` to that database only: all browser reads/writes must fail.
   Existing application databases and rules are unrelated and must not be replaced.
   Restrict server IAM to the needed Auth verification and quota database access.
3. Configure Firebase Auth and authorized domains. Existing Smart-Ledger/BFit login
   is reused. Maven/Stride/Synapse require Google sign-in and the public values from
   `.env.local.example`. Backend and frontend must use the same Firebase project.
4. Store GEMINI_API_KEY only server-side. For Firebase Functions, use Secret Manager
   and deploy the `aiGateway` function and its hosting rewrite together after approval.
   For Synapse, supply GEMINI_API_KEY and AI_FIREBASE_PROJECT_ID through the server's
   secret/environment configuration, using workload identity/ADC for Admin SDK.
5. Verify unauthorized/expired/wrong-project requests fail and authorized requests
   succeed. Confirm quota failures stop Gemini requests, and verify streaming where
   relevant. Check model availability in the actual provider project before release.
6. Rebuild and replace all old hosted browser assets, remove cached release assets,
   scan Git history and old deployments for exposed keys, rotate/revoke old keys,
   and remove old frontend build-secret configuration. Do not paste secrets into PRs.

## Local development and validation

Use Node 22. Install root dependencies with `npm ci` once reviewed lockfiles are
committed. Run `npm run test:ai`, `npm run typecheck`, and `npm run build`.
Build with the dummy key `AI_SECRET_SENTINEL_NOT_FOR_BROWSER_72819` in each legacy
key variable, then run `npm run check:ai-bundle`. This checks generated browser
assets for the sentinel and direct Gemini transport. Unit tests use injected
identity/provider functions and a serializable quota-store fake; they make no
production calls and do not prove live IAM, secret configuration or deployment.

Firebase-backed apps: install dependencies in `functions/`, run `npm run build:ai`,
then start Hosting/Functions emulators on 5000/5001 against an explicitly selected
development project. The Vite proxy forwards only `/api/ai` to local Hosting.
For fully isolated Auth/Firestore emulation, connect the Firebase web Auth SDK to
the Auth emulator in your local harness; do not point emulator tests at production.
No automatic authentication bypass exists. Use ignored `functions/.secret.local`
for local server secrets. Emulator development can incur Gemini charges when a real
key is supplied; automated tests use mocks instead.

Synapse: `npm run dev` runs Express with Vite; `NODE_ENV=production npm start` serves
the build. Load server settings through `.env`; Vite public settings belong in
`.env.local`. Its existing unauthenticated meeting CRUD and in-memory storage remain
a separate production blocker; this PR secures AI endpoints only.

## Validation and next steps

Dependency-free tests run locally. Clean-build validation runs in the pull request workflow; production configuration remains a release gate. Clean dependency installation, frontend typecheck,
server compilation, frontend build and bundle checks run in [AI security CI](../.github/workflows/ai-security.yml).
No live AI calls or production data were used. Review the PR's current CI result.
Next: approve staged rollout, verify deployed access and quota rules, rotate exposed
keys, and address the remaining repository-specific audit findings.

Meeting pipeline calls now fail explicitly when embeddings or validation are unavailable instead of manufacturing zero-vector success. Large transcripts must be shortened before submission.
