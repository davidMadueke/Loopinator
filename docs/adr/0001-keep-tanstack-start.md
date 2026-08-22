# Keep TanStack Start, not Next.js

Loopinator was specced as Next.js. The directory already holds a Better-T-Stack app running TanStack Start, Express, tRPC, and Better Auth. Almost all playback work happens in the browser through Web Audio, so React Server Components would render little. We keep what is there, deploy to Vercel as a standalone directory-app, and use the file-based routes under `apps/web/src/routes/`.
