# Invite code with Google, Apple, or email, not open sign-up

Play is public, so an open registration form on `/login` would hand Editor rights to strangers. v1 runs Better Auth with Google, Apple, and email/password, each gated by one church invite code read from env. Phone and SMS sign-in wait, as do the other social providers. Church OS SSO can replace this later without touching Play URLs.
