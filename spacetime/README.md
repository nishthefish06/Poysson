# Spacetime module (Person 1)

Replace this folder's contents with the output of Spacetime's TypeScript module init
(check their docs for the exact command), keeping `package.json` name `@hack/spacetime`.

Tables to define (see plan section 7): employee, session, passkey, passkey_challenge,
scenario_public, scenario_secret (PRIVATE), run, run_event, report, badge, employee_badge.

Rules:

- `scenario_secret` (verdicts, points, ideal_path) must NOT be public / subscribable.
- Every reducer except sign_in checks the caller's session is `verified`.
- mark_verified / attach_anchor / AI-injected events: service identity only.
- Generated client bindings go in `spacetime/generated/` and are imported by the app.
