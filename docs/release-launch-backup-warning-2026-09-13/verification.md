# Stage Sketch beta launch backup warning verification

Checked 2026-09-13 JST. This record covers only the launch backup warning approved for beta publication.

## Current beta reference

- Active version before deployment: `b8c7e1bb-f730-469e-92da-8b989ec2a53b`
- Active deployment: `b502715e-af84-46a3-a1ce-a36a2c419115`
- Downloaded Worker SHA-256: `1b74f5d60d0f215470a417268e00a5eed24067fa8d984ab4a08d3fbfaa76701f`
- The downloaded active Worker is preserved as `baseline-worker.js` outside the upload candidate.

## Candidate boundary

- Candidate Worker SHA-256: `1ae389cca1067e8f239e3fe437fa789d9439f1ad5199f991f8bebb37ff5100d5`
- Changed effective routes: `/stage`, `/stage.html`, `/style.css`, `/stage-i18n.js`, `/stage-sketch.js`, `/stage-sw.js`
- The other 47 effective routes have identical SHA-256 hashes.
- Removing the warning markup, warning CSS, four translations, element bindings, launch handler, and cache-reference increments restores all six changed route bodies byte-for-byte to the active beta.
- Worker logic outside the two generated asset tables is byte-identical.

## Required compatibility checks

- Existing features: pass. No existing feature route or existing feature logic changed. The modal connects to the existing project export function.
- Project roundtrip: pass by non-impact proof. Serialization, import, export, autosave, migration, identifiers and unknown-field handling remain byte-identical to the active beta outside the added warning handler.
- Audio continuity: pass by non-impact proof. Music UI, audio storage, reconnect, playback and cue code and assets remain byte-identical to the active beta.
- Storage failure safety: pass by non-impact proof. Storage and recovery code is unchanged. The warning handler writes neither `localStorage` nor `sessionStorage`.
- Update and rollback: pass. The complete active Worker source is preserved with its SHA-256. The candidate only increments the three changed asset references and the PWA cache from v343 to v344, while retaining the complete-shell and old-cache fallback logic byte-for-byte.
- Target browsers: pass for automated scope. Chromium and WebKit both showed the warning at a fresh document launch, kept it closed after dismissal during the running document, showed it again after a fresh reload, exempted only `guest1`, warned on unknown identity and fit the 390 x 844 viewport. No page errors were reported. Physical Safari was not manipulated because the user was actively using another Safari tab; WebKit is the Safari-engine check for this release.

## Test results

- Candidate inverse-diff and syntax verification: pass.
- Warning, identity, export ZIP, local shows, audio and PWA focused tests: 84 passed, 0 failed.
- Beta safety gate tests: 8 passed, 0 failed.
- `python3 build_stage.py --check`: pass; `study-frame.html` matches `stage.html`, and Stage Sketch remains separate from the Study entrypoint.
- Fixed-candidate Chromium and WebKit browser check: pass.
- Candidate mobile geometry: pass at 390 x 844.

## Launch semantics

- The warning is called once from document initialization after `/whoami` resolves.
- Closing it does not store a suppression flag and does not register a timer or navigation listener that can reopen it during the same running document.
- Starting the app again or reloading the Stage document creates a fresh document and shows the warning again.
- `guest1` is the only named exemption. An unavailable identity fails closed and shows the warning.

## Evidence files

- `manifest.json`
- `candidate-verification.json`
- `candidate-browser-check.json`
- `docs/ui-launch-backup-warning-2026-09-13/browser-check.json`

No unresolved compatibility risk was found within this warning-only route boundary. Post-deployment verification must still confirm the active Cloudflare version, the six live route hashes, the public beta status and an authenticated live launch.
