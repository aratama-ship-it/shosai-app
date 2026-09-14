# Stage Sketch beta warning close controls verification

Checked 2026-09-13 JST. This record covers only the requested close controls for the existing launch backup warning.

## Current beta reference

- Active version before deployment: 92ba680c-6849-40f5-91a7-74264444e30f
- Active deployment: 8dda9328-989d-4784-81f9-ac891f7a6f65
- Downloaded Worker SHA-256: 1ae389cca1067e8f239e3fe437fa789d9439f1ad5199f991f8bebb37ff5100d5
- The downloaded active Worker is preserved as baseline-worker.js outside the upload candidate.

## Candidate boundary

- Candidate Worker SHA-256: b0e07f79257b6c7c85ef14a44a0936605fe785428af407570d38652a1e82cf6f
- Changed effective routes: /stage, /stage.html, /style.css, /stage-sketch.js, /stage-sw.js
- The other 48 effective routes have identical SHA-256 hashes.
- Removing the close button, close CSS, two dismissal handlers, focus-trap change, and cache-reference increments restores all five changed route bodies byte-for-byte to the active beta.
- Worker logic outside the two generated asset tables is byte-identical.

## Required compatibility checks

- Existing features: pass. The warning text, export button, continue button, guest1 exemption, and launch timing remain in place. Only two close paths were added.
- Project roundtrip: pass by non-impact proof. Serialization, import, export, autosave, migration, identifiers, and unknown-field handling are byte-identical to the active beta.
- Audio continuity: pass by non-impact proof. Music UI, audio storage, reconnect, playback, and cue code and assets are byte-identical to the active beta.
- Storage failure safety: pass by non-impact proof. Storage and recovery code is unchanged. The new handlers write neither localStorage nor sessionStorage.
- Update and rollback: pass. The active Worker source is preserved with its SHA-256. The candidate advances style.css from 292 to 293, stage-sketch.js from 416 to 417, and the PWA cache from 344 to 345 while retaining existing update safeguards.
- Target browsers: pass. Chromium and WebKit both showed the warning at a fresh launch, closed it from the top-right button and outside click, showed it again after reload, exempted only guest1, warned on unknown identity, and reported no page errors. The close target measured at least 44 by 44 pixels.

## Test results

- Candidate inverse-diff and JavaScript syntax verification: pass.
- Warning, project ZIP export, local shows, audio, PWA, offline update, and storage-caution focused tests: 77 passed, 0 failed.
- Beta safety gate tests: 8 passed, 0 failed.
- build_stage.py --check: pass; study-frame.html matches stage.html and Stage Sketch remains separate from the Study entrypoint.
- Fixed-candidate Chromium and WebKit browser check: pass.
- Local 1440 by 900 and 390 by 844 geometry and interaction check: pass.

## Launch semantics

- The warning still opens once from document initialization after identity resolution.
- The top-right button and backdrop call the same close path as the existing continue button.
- Closing does not store a suppression flag and cannot reopen the warning in the same document.
- Starting the app again or reloading creates a fresh document and shows the warning again.
- guest1 remains the only named exemption. An unavailable identity continues to show the warning.

No unresolved compatibility risk was found within this warning-close-only boundary. Post-deployment verification must still confirm the active Cloudflare version, the five live route hashes, public beta status, and authenticated live behavior.
