OWNER: Person 1. SimpleWebAuthn routes go here if Spacetime can't verify WebAuthn natively:

- options.post.ts (registration/auth options)
- verify.post.ts (verify response, then call mark_verified as the service identity)
