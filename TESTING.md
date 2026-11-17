# Delivery verification

Latest verification: 17 November 2026 with Node.js 24.22.1.

## Version 1.1: standard planning, optional calibration and gray levels

- All **16 numerical tests passed**, including six new tests for blank/omitted advanced inputs, sample/reference quantization variance, averaging reference frames, independent bisection of the quantization-aware optimizer, shared reference ceilings, validation, and the high-gray-signal limit.
- Calibration starts collapsed with four blank numerical fields. Browser inspection confirmed that blank fields are valid, a plan is produced without calibration entries, and the standard assumptions are displayed explicitly.
- Entering only the open-beam signal displayed the required signal/exposure pairing message and disabled export. Adding its exposure restored the plan and enabled the quantization terms.
- Browser example: an open-beam signal of 100 ADU at 1 s, with blank step/frame inputs (resolved to 1 ADU and one frame), gives 8 sample ADU per projection and model SNR 158.112 at the default 0.16 s exposure; detected neutron-equivalents remain 20 per pixel. The low-gray approximation warning is shown.
- Changing k to 2 reduced the model SNR to 79.056. Clearing that input restored k = 1 and SNR 158.112.
- Export downloaded successfully and was inspected for version 1.1.0, separate entered/resolved inputs, neutron-equivalent and ADU units, and the included quantization model.
- Reset cleared all eight optional numeric fields, collapsed advanced calibration and restored the standard plan with no quantization estimate (model SNR 212.809). Prior requested beam/sample defaults are preserved.
- No browser warning/error console entries were reported in these checks. A desktop screenshot was saved alongside the versioned ZIP. The updated application was rebuilt and all six static assets returned HTTP 200.
- These are implementation checks, not measured detector or reconstructed-image validation. Quantization assumes linear unsaturated native data and independent rounding; reference Poisson/read noise and dark-subtraction uncertainty remain excluded and are disclosed in the app and README.

## Updated defaults and explanatory sections

- `node --test tests/physics.test.cjs`: **10 tests passed, 0 failed**, including feasibility of the new large-sample default plan. The original analytical fixture remains fixed independently of the UI defaults.
- Defaults: detector efficiency 100%, effective pixel size 50 µm, diameter 150 mm, transmission 50%. Required full-period resolution remains 100 µm.
- Updated example result: 4,713 projections, 0.16 s per projection, angular increment 0.0381922°, model SNR 212.809 and 10,180.08 s total. The count floor, rather than target SNR 30, sets the exposure. There are 288 feasible projection counts within the default maximum of 5,000.
- Added bullet-point explanations for k, F, read noise, shared noise floor, detector efficiency, pixel size and the calibration note. Added illustrative SNR brackets with relative noise and interpretation; no detection thresholds are claimed.
- Rebuilt `dist` from the updated sources.
- Browser confirmed all four requested defaults, the new SNR table and calibration bullets, and a feasible displayed plan. Changing transmission and pressing Reset restored the new defaults. The SNR guide was visually inspected at desktop width.

## Initial delivery checks (previous example defaults)

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
