# Delivery verification

Verified on 16 November 2026 with Node.js 24.22.1.

- `node --test tests/physics.test.cjs`: **9 tests passed, 0 failed**.
- `node scripts/build.cjs`: generated the deployable `dist` directory successfully.
- Local server returned HTTP 200 for the application.
- Browser loaded the example and both Plotly charts; no warning/error console entries were reported during these checks.
- Example result: 315 projections, 0.533333 s exposure, 0.571429° increment, model SNR 95.5624, 798 s total. The target of 30 is exceeded because the minimum count constraint is active.
- Changing the target SNR to 200 recalculated to about 2.336 s per projection and 22.76 minutes total, at model SNR 200.
- Changing pixel size from 50 µm to 60 µm with 100 µm full-period resolution displayed a sampling error and disabled export. Reset restored the example.
- Export downloaded a JSON plan successfully. The payload includes input units, model status, calibration note, optimal plan, assumptions and all 4,686 feasible candidates for the example.
- A mobile-width browser check showed no horizontal document overflow (375 CSS-pixel content width). Desktop layout was visually inspected and a preview image was saved alongside the source ZIP.

The environment provides Node but no npm executable, so local checks used the direct Node equivalents of the package scripts. No npm dependencies require installation. The dependency-free lockfile is included for `npm ci` on ordinary Node installations and Render. Render's documented Blueprint fields were checked against its official documentation; this delivery does not include a live Render deployment or a remote Render build verification.

The numerical tests establish implementation consistency only. No instrument measurements, physical resolution validation or experimental SNR calibration were available. The offline Plotly fallback is implemented but was not separately exercised in the browser.
