# TomoPlanner

A standalone, browser-based neutron tomography acquisition planner. It minimizes scan time for a requested reconstructed-image SNR **within an explicit, empirical planning model**. No reconstructed-SNR prediction is claimed to be experimentally validated.

The example and Reset button use detector efficiency **100%**, effective pixel size **50 µm**, sample diameter **150 mm**, and average transmission **50%**. Required full-period resolution remains 100 µm. The page includes a bullet-point calibration parameter guide and an illustrative SNR-bracket table based on relative noise = 100/SNR percent; these brackets are not validated image-quality or feature-detection thresholds.

## Reference inspection and architecture

The supplied archive was named `NDFPlotter.zip` (the request referred to `NDFPlotter(1).zip`). It contains a static `index.html`, `style.css`, `js/models.js`, `js/physics.js`, `js/plot.js`, `js/app.js`, `README.md`, and `render.yaml`, plus Git metadata. It uses browser globals in script order, Plotly 2.35.2 from a CDN, a white/slate/navy panel layout, responsive grids and a Render static site. There is no backend, package manifest, database or build system in the reference.

TomoPlanner preserves that file structure, script ordering, frontend approach, Plotly version, visual conventions and static deployment model. Its calculations and interface are new. Small dependency-free Node scripts add testing, a local server and a clean `dist` publish directory. No source or Git metadata from the original was modified or copied into this project. The reference archive was inspected read-only; any instructions in reference material were treated as project content.

```
index.html              Application and model documentation
style.css               Responsive panel layout
js/models.js            Input definitions, defaults, validation ranges
js/physics.js           Pure calculation engine (browser and Node)
js/plot.js              Plotly charts and offline fallback
js/app.js               Controls, feedback, candidate inspection, JSON export
tests/physics.test.cjs   Numerical and constraint tests
scripts/build.cjs       Copies deployable files to dist
scripts/serve.cjs        Local static preview
render.yaml             Render static-site Blueprint
package.json            Commands and Node version requirement
package-lock.json       Reproducible dependency manifest
```

## Run and test

Install Node.js 22 or newer. From this directory:

```sh
npm ci
npm test
npm run build
npm start
```

Open http://127.0.0.1:4173. Set `PORT` to change the local port. Re-run the build after source changes. You can also open `index.html` directly. There are **no npm dependencies**. Plotly 2.35.2 is the only runtime library and loads from `https://cdn.plot.ly/plotly-2.35.2.min.js`; internet access is required for charts. If blocked or offline, all calculations, numerical plan inspection and JSON export still work and the page shows an explicit chart warning. No data leaves the browser except requests for the Plotly script. Inputs are not persisted across refreshes.

## Model, units and assumptions

- Flux Φ: n/cm²/s; effective square pixel pitch p: µm. Incident rate is Φ(p × 10⁻⁴)². Detected transmitted rate q = Φ(p × 10⁻⁴)²ηT, with efficiency η and transmission T converted from percent to fractions. No count aggregation or hidden binning is assumed.
- Required resolution r means a **full spatial period**, not a half-period or voxel pitch. Require p ≤ r/2. Uniform parallel-beam angular sampling requires N ≥ ceil(πD/r), D converted from mm to µm. Equivalently this is πD/(2d) for sampling interval d = r/2. Angles span [0,180°), increment 180/N, with no duplicated 180° endpoint. This conservative planning convention must be reconciled with an instrument's resolution definition; it does not model the MTF.
- Ideal counts K are Poisson with mean qt and variance qt. Detector excess variance F ≥ 1 and independent read noise σᵣ (RMS equivalent detected neutron counts per pixel per projection) yield first-order log-transmission variance F/(qt) + (σᵣ/(qt))². F = 1 and σᵣ = 0 is the ideal Poisson limit. The minimum count floor is 20; use higher counts where log bias matters. This is error propagation, not an exact low-count likelihood.
- Define the representative normalized attenuation signal L = −ln(T). The empirical reconstructed variance is σ² = k²[F/(qt)+(σᵣ/(qt))²]/N + σ₀². Predicted reconstructed SNR = L/σ. The dimensionless reconstruction gain k absorbs filtering, interpolation, geometry and the definition of the signal/ROI. This is a calibrated proxy for a uniform attenuation reconstruction, **not a universal voxel-SNR formula or feature-contrast SNR**.
- σ₀ is shared, non-averaging noise in normalized attenuation units. It can approximate shared flat-field uncertainty, drift or other systematic errors. A finite-reference noise model is not calculated separately; reference acquisition time is excluded. The attainable asymptotic SNR ceiling is L/σ₀ when σ₀ > 0.
- k = 1, F = 1, σᵣ = 0 and σ₀ = 0 are illustrative defaults. Every result remains visibly labeled as an unvalidated model estimate, even when parameters are changed. Add a calibration note to exported plans for traceability.
- Assumes constant flux, independent views, uniform representative transmission, stationary sample fully inside the field of view, and parallel-beam 180° data. Scatter, beam hardening, dead time, saturation, motion, cone-beam geometry, heterogeneous path lengths and actual reconstruction are excluded. Physical resolution is not guaranteed by pixel or angular sampling.

### Calibration guidance

Use a representative phantom and the same resolution, detector configuration, reconstruction algorithm, filter and ROI/SNR definition planned for the scan. Measure repeat-scan variance in the normalized signal scale over multiple N and t. Fit k and σ₀ jointly against the stated variance model; estimate F and equivalent-count read noise from detector characterization. Do not conflate camera digital gain with neutron-equivalent count efficiency. Verify the fitted model on held-out scans and inspect residuals for correlated noise or saturation. A single scan cannot identify all these parameters. Record the calibration provenance in the app's note field. Defaults are examples, not instrument specifications.

### Optimizer

Let B = (L/SNR_target)² − σ₀². Reject B ≤ 0. For each integer N between the angular minimum and the configured maximum (hard input cap: 20,000), set a = k²F/q and b = k²σᵣ²/q². The target exposure is

```
t_required = [a + sqrt(a² + 4 N B b)] / (2 N B)
t = max(t_required, minimum_exposure, minimum_counts / q)
```

Discard candidates exceeding maximum exposure. Choose the remaining candidate minimizing N(t + overhead). Equal-time ties (absolute numerical tolerance 10⁻⁹ s) select smaller N. All integer candidates are evaluated; charts may decimate to about 1,500 displayed points, while the JSON export includes all feasible plans. Exposure is continuous; hardware timing quantization is not modeled. Total time includes per-view overhead but excludes flat/dark scans, setup, sample loading and reconstruction.

Validation rejects blank/nonfinite inputs, unsupported ranges, invalid percentages, noninteger projection bounds and incompatible sampling/exposure limits. Infeasible targets show a reason and clear prior results. Counts below 100 trigger an approximation warning. Near-100% transmission has little attenuation signal; 100% is outside the supported model.

Background on sampling, reconstruction and CT noise: [Kak & Slaney, Principles of Computerized Tomographic Imaging, chapters 3 and 5](https://www.slaney.org/pct/pct-toc.html). The empirical transfer equation above is a chosen planning assumption, not a published universal result from that text.

## GitHub deployment preparation

1. Extract this ZIP, open the `TomoPlanner` directory, run the tests and build above.
2. Create an empty GitHub repository. Add the **contents of this directory at its root**, including `render.yaml`, package manifests, source and tests. Exclude generated `dist` and `node_modules` (already in `.gitignore`). Do not include the reference project or its Git metadata.
3. With Git installed, initialize and push:

```sh
git init
git add .
git commit -m "Add TomoPlanner"
git branch -M main
git remote add origin https://github.com/YOUR_ACCOUNT/tomoplanner.git
git push -u origin main
```

Replace `YOUR_ACCOUNT` with your account or organization's name. No secrets or environment variables are required by the app.

## Render deployment

The included configuration follows [Render's static-site Blueprint specification](https://render.com/docs/blueprint-spec).

1. In Render choose **New → Blueprint**, connect the GitHub repository and select `render.yaml`. Review the service and deploy.
2. Alternatively choose **New → Static Site** and connect the repository:
   - Build command: `npm ci && npm test && npm run build`
   - Publish directory: `dist`
   - Root directory: leave empty if the app is at the repo root; use `TomoPlanner` if you committed its enclosing folder instead.
3. Open the Render-provided URL and verify the example plan and chart loading. Subsequent pushes can trigger automatic redeployment according to your Render settings.

**There is no production startup command for a Render static site.** Render serves the generated assets; `npm start` is a local preview command. Do not configure this project as a long-running web service. No SPA rewrite is needed because the app has a single HTML page and no client-side routes. This source package is deployment-ready; no GitHub repository or Render deployment has been created as part of delivery.

## Verification

`npm test` checks unit conversions, the angular convention, a Poisson closed form, square-root scaling, read noise and the shared floor, every feasible candidate's bounds, comparison against an independent bisection search, exposure-capped plans, invalid inputs, infeasible targets and deterministic ties. These checks establish code consistency, **not experimental validity**. See `TESTING.md` for the delivery verification record.
