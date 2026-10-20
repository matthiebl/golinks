# go/ — personal golinks

A personal golink service: short keywords (`go/gh`, `go/a/b/c`) that redirect to real URLs,
backed by Firestore, served as a static React app on `go.mhiebl.com`.

Built for one person and a scale of maybe 100 links — not hardened for public/multi-tenant use.

## Stack

React 19 + TypeScript + Vite + Tailwind CSS v4 + React Router v7, with Firebase
(Firestore for data, Auth for the owner's sign-in, Hosting to serve the built app).

## How it resolves

Two Chrome entry points, both handled by the same app:

1. **Default search engine** — set Chrome's search engine URL to
   `https://go.mhiebl.com/?q=%s`. A hit redirects; a miss forwards the query to Google.
2. **Site search keyword** — set a Chrome site search shortcut (keyword `go`) to
   `https://go.mhiebl.com/%s`, so typing `go` Tab `xxx` goes to `go.mhiebl.com/xxx`. A hit
   redirects; a miss lands on the home page prefilled to create that keyword, with a
   "search Google instead" button. See Settings to instead have a miss go straight to Google.

The app home page has a search box for keywords, descriptions, and destinations. When a searched
keyword does not exist, the suggestions offer to create `go/<keyword>` with the name prefilled,
alongside the Google search option. Creating and editing links require the owner's sign-in.

Resolution supports:
- **Aliases** — `go/yt` can point to the saved redirect `go/youtube`, and
  `go/stream/disney` can point to `go/disney`. Aliases follow changes to the target URL,
  pass along path segments and search arguments, and keep their own hit counts. Targets
  must be saved redirects; aliases cannot point to groups or other aliases. If a target
  is deleted or changed to another kind, the alias displays a clear error until edited.
- **Tree pages** — `go/stream` shows the full nested hierarchy under that path, including
  `go/stream/disney` and deeper links such as `go/stream/music/playlists/focus`. All levels remain
  visible, with branch lines aligned beneath the centre of each parent icon. Missing parent keywords become browsable trees automatically, while saved
  tree records can have descriptions or be empty. Trees can be nested to any depth. A saved
  redirect at a parent keeps redirecting until it is converted to a tree.
- **Longest-prefix matching** — `go/a/b/c` and `go/a/b/d` can both exist under `go/a/b`; visiting
  `go/a/b/anything-else` falls back to `a/b`'s URL with `/anything-else` appended if `a/b` has its
  own redirect and no more specific match exists. A tree stops fallback through that path.
- **`{*}` / `%s` substitution** — a link's URL can contain `{*}` or `%s`, e.g.
  `https://github.com/search?q={*}`, and the remaining words/path get substituted in.
- **Usage counts** — each redirect bumps a hit counter (fire-and-forget; never delays the redirect).

The full logic is in [src/lib/resolve.ts](src/lib/resolve.ts) (pure, unit-tested — see
[src/lib/resolve.test.ts](src/lib/resolve.test.ts)) and orchestrated per-request in
[src/lib/redirectFlow.ts](src/lib/redirectFlow.ts), which tries a localStorage cache first for an
instant redirect and confirms anything else against Firestore directly.

## Data model

One Firestore collection, `links`, document ID = keyword (with `/` replaced by `%2F` since
Firestore IDs can't contain slashes — see [src/lib/links.ts](src/lib/links.ts)):

```ts
{
  keyword: string       // e.g. "a/b/c" — lowercase, ".", "_", "-", "/" only
  kind: 'redirect' | 'tree' | 'alias' // omitted on older records; treated as redirect
  url: string           // redirect destination; may contain {*} or %s; empty otherwise
  target: string        // target keyword for an alias; empty otherwise
  description: string   // optional
  createdAt, updatedAt: Timestamp
  hits: number
  lastUsedAt: Timestamp | null
}
```

Deleting a saved tree record does not delete its children. If children remain, the path is still
available as an automatically derived tree.

## Setup

1. `npm install`
2. Copy `.env.local.example` to `.env.local` and fill in your Firebase project's web config.
3. In the Firebase console for that project:
   - **Build → Firestore Database → Create database** (Native mode, any region) — on a brand new
     project this API starts disabled, and the app just hangs on "Loading…" with no error until
     it's created.
   - **Build → Authentication → Sign-in method → Add provider → Google.**
4. `npm run dev`, sign in with Google (top right), then check Authentication → Users in the
   console for the UID that just appeared.
5. Set `VITE_OWNER_UID` in `.env.local` to that UID, **and** replace `OWNER_UID` in
   [firestore.rules](firestore.rules) with the same value (env vars aren't available to security
   rules, so it has to be hardcoded there too — keep the two in sync). Restart `npm run dev` to
   pick up the env change.
6. `firebase login` if needed, then `firebase deploy --only firestore:rules` from the repo root
   (uses the project in [.firebaserc](.firebaserc)).

## Deploy

```bash
npm run deploy   # builds and runs `firebase deploy --only hosting`
```

Attach the custom domain in the Firebase console: Hosting → Add custom domain → `go.mhiebl.com`,
then follow its DNS instructions.

## Security model

- Anyone can **read** the `links` collection and resolve a keyword — there's no auth gate on
  reads, since the whole point is redirects working for an unauthenticated browser tab. Don't put
  anything sensitive in a keyword, URL, or description.
- Only the owner (matched by UID) can **create/edit/delete** a link.
- An unauthenticated bump of the `hits`/`lastUsedAt` fields by exactly `+1` is allowed, so the
  redirect page can count a hit without needing to sign in. No other field can be touched that way.

See [firestore.rules](firestore.rules) for the exact rules.

## Scripts

```bash
npm run dev       # Start dev server
npm run build     # Type-check + production build → dist/
npm run test      # Run resolve.ts unit tests (vitest)
npm run preview   # Serve the production build locally
npm run lint      # Run ESLint
npm run deploy    # Build and deploy to Firebase Hosting
```

## Project structure

```
src/
  lib/
    firebase.ts       # Firebase app/auth/firestore init
    links.ts           # Link type, validation, Firestore CRUD, keyword <-> doc ID
    resolve.ts          # Pure keyword resolution (exact/prefix/{*}/miss) — unit tested
    redirectFlow.ts     # Cache-first, Firestore-confirmed resolve-and-redirect orchestration
    cache.ts            # localStorage cache of the full link set
    settings.ts         # Persisted "miss" behavior preference
  hooks/
    useAuth.ts           # Firebase Auth state + isOwner check
    useLinks.ts           # Live Firestore subscription + cache sync
  components/
    SearchBar.tsx        # Home page search/jump box
    LinkForm.tsx          # Validated create/edit form
    LinkTree.tsx          # Full-depth folder view with icon-aligned branches
    AuthButton.tsx          # Sign in/out
  pages/
    Home.tsx              # Focused search; handles ?q= and redirects legacy ?new=
    NewLink.tsx           # /-/new — dedicated create page, accepts keyword prefill
    Resolve.tsx             # Catch-all route: resolves any other path as a keyword
    EditLink.tsx              # /-/edit/<keyword>
    AllLinks.tsx               # /-/all — searchable list and tree views
    Settings.tsx                # /-/settings — miss behavior, Chrome setup, account
```

Admin routes live under the reserved `/-/...` prefix so every other path is available as a keyword.
