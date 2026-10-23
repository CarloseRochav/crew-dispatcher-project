# Step 4: Login and role-based redirect

Approved 2026-10-22.

## Goal

The dispatcher and crew members sign in with email and password. After login the dispatcher lands on `/board` and a crew member on `/crew`, both placeholders for now. A logged-out visitor is sent to `/login` from any page.

## Decisions and why

| Decision | Why |
| --- | --- |
| Email + password, no magic link | The spec says "email login" without naming a method. The demo users already have passwords, and a magic link would need email delivery set up for the demo. |
| No signup page | Demo logins are created in Authentication > Users. A signup page adds a screen nobody needs for the demo. |
| Turn off public signups in the Supabase dashboard (manual) | Signups are already harmless: a new account starts as a crew with no crew and sees no jobs. Turning them off closes the door anyway. |
| Session refresh and the logged-out redirect live in `proxy.ts` | Next 16 renamed Middleware to Proxy. `@supabase/ssr` needs a request-level hook to refresh the auth cookie, because Server Components cannot set cookies. |
| The real role check runs in each page, not in the proxy | The Next.js docs say Proxy is for optimistic checks only, not authorization. Pages read the role from `profiles` through `getCurrentProfile()`. |
| RLS stays the actual protection | Redirects only decide which page you see. Even if a redirect were wrong, a crew still could not read another crew's jobs. |
| Session reads sit inside `<Suspense>` | `cacheComponents` is on in `next.config.ts`. Reading cookies outside a Suspense boundary is a build error. |
| `getClaims()` instead of `getSession()` | `getClaims()` verifies the token; `getSession()` trusts whatever is in the cookie. |
| One generic login error ("Email or password is incorrect") | Does not reveal which emails have accounts. |
| zod on the login form, validated again in the server action | Project rule: validate every boundary, including our own forms. |
| shadcn `button`, `input`, `label` | Source files only. Their one package, `radix-ui`, is already installed, so no new dependency. |

## Files

| File | Purpose |
| --- | --- |
| `proxy.ts` | Refreshes the session on every request; sends logged-out visitors to `/login`; skips static assets |
| `lib/supabase/proxy.ts` | The session-refresh function (`@supabase/ssr` pattern) |
| `lib/auth.ts` | `getCurrentProfile()` (role and `crew_id` from `profiles`) and `homePathFor(role)` |
| `app/login/schema.ts` | zod schema: valid email, non-empty password |
| `app/login/actions.ts` | `signIn` and `signOut` server actions |
| `app/login/page.tsx`, `app/login/login-form.tsx` | Login screen with design tokens and 44px touch targets |
| `app/page.tsx` | Sends `/` to the right home, or to `/login` |
| `app/board/page.tsx` | Dispatcher placeholder + sign out; a crew is redirected away |
| `app/crew/page.tsx` | Crew placeholder + sign out; a dispatcher is redirected away |
| `components/ui/button.tsx`, `input.tsx`, `label.tsx` | Added with `npx shadcn add` |
| `tests/auth.test.ts` | Unit tests for the schema and `homePathFor` |

## Out of scope

- The real dispatcher board (Step 5) and crew day view (Step 7)
- What a crew login with no crew assigned sees (open question, Step 7)

## How to verify

1. Sign in as each demo user and land on the right page.
2. As a crew, open `/board`: redirected to `/crew`.
3. Sign out, then open any page: sent to `/login`.
4. Wrong password: the generic error.
5. `npm test` and `npm run build` pass. The build matters because of `cacheComponents`.

## Risk

With `cacheComponents` on, a redirect that runs inside `<Suspense>` may happen in the browser instead of on the server. If the build or a manual test shows a problem, fix it within this step.

Outcome: confirmed and accepted. A role redirect (for example a crew opening `/board`) answers `200` and streams the redirect: the browser navigates right away with JavaScript, or after 1 second through a `<meta http-equiv="refresh">` without it. The wrong page's content is never sent, because `requireRole` redirects before it renders. The logged-out redirect runs in `proxy.ts` and is a real `307`. A server-side `307` for role redirects would need the role inside the login token (a Supabase custom access token hook, a new migration); not worth it for Step 4.

## Changes from the plan

- `homePathFor` lives in `lib/home-path.ts`, not `lib/auth.ts`, so the unit test can import it without the Next.js server modules.
- The header with the sign-out button is shared: `components/signed-in-header.tsx`.
- The Supabase clients now use the generated `Database` types, so the `profiles` query is typed.
- `getCurrentProfile()` starts with `await connection()`. `partialPrefetching` is on, so `cookies()` resolves during prerender, and `getClaims()` then calls `Date.now()` to check token expiry; Next.js reports that as an unstable value. Found in the browser console during the manual login test (see `docs/ai-log.md`).
