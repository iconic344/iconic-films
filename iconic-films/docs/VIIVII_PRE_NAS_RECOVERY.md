# VIIVII Sara — pre-NAS safety and handover (2026-10-11)

## Current safe public mode

- `src/viivii-public-snapshot.json` is a **sanitized editorial presentation snapshot** of the saved `VIIVII sara` config, including the team's Fashion / Commercial / Events layout, settings, and nonprivate captions.
- All references to suspended Supabase Storage assets and private profile/contact keys are stripped from that public snapshot.
- The live app first tries `/api/config`. On failed requests (including Supabase HTTP 402), it uses the VIIVII snapshot so the public site continues to show the intended layout, rather than the retired ICONIC starter demo.
- **Do not write the fallback snapshot to the database.** It is read-only for public rendering and is intentionally missing all heavy media. If Supabase is blocked, the administrator's remote Save / Upload cannot succeed. Do not falsely report a successful edit.
- Existing saved settings and video references are retained in Supabase, with a 2026-10-11 point-in-time backup. The browser's previous working cached config is intentionally NOT overwritten by the sanitized fallback.

## Database backup (stored only in Supabase, not the public repository)

The original 3 JSON objects are saved in `public.iconic_settings`:

- `backup:viivii-pre-nas-2026-10-11:config`
- `backup:viivii-pre-nas-2026-10-11:media:3a5b400a-5a56-4ddf-a6b7-ae1574bb717d:works:0`
- `backup:viivii-pre-nas-2026-10-11:media:3a5b400a-5a56-4ddf-a6b7-ae1574bb717d:tracks:0`

The original `config` and `media:...` keys were NOT overwritten. These backups contain private settings and belong in access-controlled DB backups, NEVER in a publicly accessible bundle.

## NAS integration contract — not enabled yet

1. Serve media over a dedicated HTTPS origin (suggestion: `media.viiviisara.com`) using a trusted reverse proxy, with correct TLS, CORS, `Content-Type`, `Accept-Ranges`, `206 Partial Content` video seeking, and HTTP cache headers.
2. Choose NAS storage keys independent of React components or absolute hostnames, e.g. `works/fashion/{uuid}.mp4`, `works/commercial/{uuid}.webp`, `models/{uuid}.glb`, `audio/{uuid}.mp3`. Persist relative `mediaKey` fields or a separate stable media manifest.
3. Keep NAS admin credentials private; add an authenticated, expiring upload-ticket endpoint to the existing server API. Never expose the NAS filesystem, management UI, token, or password to browsers. Limit upload types/sizes and require site-admin authorization.
4. Migrate media references with an explicit old-URL -> NAS-key mapping AFTER uploading originals. Verify hashes and video Range requests before switching the site; retain DB backup and old refs until done.
5. Restore regular public assets one at a time in EDIT SITE after confirmed DB API access. Do not recreate/delete a team/member/site in order to repair a media link.
6. Monitor downstream Supabase cached egress (<5 GB/period), API health, and NAS upstream bandwidth. Never use Supabase Storage as a silent fallback for public videos.

## Recovery guardrails

- Supabase Free 'cached egress' was 52.059 GB/5 GB for Oct 3–Nov 3, 2026, causing HTTP 402. Lowering stored file size now will not reset consumed traffic in this period.
- A **static fallback repairs the public page's structure** but does NOT restore missing videos, administrator saves, login sessions or notifications while the DB API is suspended.
- Do not delete Supabase media, downgrade/reseed site config, or convert the sanitized public JSON into the new canonical editable record.
- When the billing period resets and the backend returns `source: saved`, the app will resume the authoritative VIIVII DB config automatically.

## Temporary pre-NAS opening video (2026-10-11)

- The owner-provided `777.mp4` is available in the public build as `/media/viivii-hero-777.mp4` (H.264, 1920x1080, 8.3 seconds, about 2.5 MB).
- Its poster is `/media/viivii-hero-777-poster.jpg` (extracted from the same video, no placeholder photo).
- Both `src/viivii-public-snapshot.json` and the saved Supabase `config` have these two media paths. The older source media links remain intact in the private `backup:viivii-pre-nas-2026-10-11:config` backup.
- This static video is served by the site's own web host, bypassing restricted Supabase Storage, and must be moved to the NAS origin once enabled. Keep the same content paths via redirects or update the relative asset keys in a single transaction.
- If offline public config is being shown during a Supabase 402, the current video remains available even though the other media placeholders remain intentionally empty.
