(function (root) {
  'use strict';
  const models = typeof module !== 'undefined' && module.exports ? require('./models.js') : root.TomoModels;
  function validate(p) {
    const errors = [];
    for (const f of models.fields) {
      if (typeof p[f.key] !== 'number' || !Number.isFinite(p[f.key]) || p[f.key] < f.min || p[f.key] > f.max)
        errors.push(`${f.label} must be a finite number from ${f.min} to ${f.max}.`);
    }
    if (!Number.isInteger(p.maxProjections)) errors.push('Maximum projections must be an integer.');
    if (p.minExposure > p.maxExposure) errors.push('Minimum exposure cannot exceed maximum exposure.');
    if (p.pixel * 2 > p.resolution) errors.push('Pixel sampling is insufficient: effective pixel size must be at most half the requested full-period resolution.');
    return errors;
  }
  function constants(p) {
    return { rate:p.flux * (p.pixel * 1e-4) ** 2 * p.efficiency / 100 * p.transmission / 100,
      signal:-Math.log(p.transmission / 100), minProjections:Math.max(2,Math.ceil(Math.PI * p.diameter * 1000 / p.resolution)) };
  }
  function snr(p,n,t) {
    const c=constants(p), counts=c.rate*t;
    return c.signal / Math.sqrt(p.gain ** 2 * (p.excess/counts + (p.readNoise/counts)**2)/n + p.floor**2);
  }
  function candidate(p,n,c=constants(p)) {
    const budget=(c.signal/p.target)**2-p.floor**2;
    if (budget <= 0) return null;
    const a=p.gain**2*p.excess/c.rate, b=(p.gain*p.readNoise/c.rate)**2;
    const required=(a+Math.hypot(a,2*Math.sqrt(n*budget*b)))/(2*n*budget);
    const exposure=Math.max(required,p.minExposure,p.minCounts/c.rate);
    if (!Number.isFinite(exposure) || exposure > p.maxExposure*(1+1e-12)) return null;
    return {projections:n,exposure,angle:180/n,snr:snr(p,n,exposure),counts:c.rate*exposure,total:n*(exposure+p.overhead)};
  }
  function optimize(p) {
    const errors=validate(p);
    if (errors.length) return {ok:false,errors};
    const c=constants(p);
    if (c.minProjections>p.maxProjections) return {ok:false,errors:[`Angular sampling requires at least ${c.minProjections} projections; increase the maximum.`]};
    if ((c.signal/p.target)**2<=p.floor**2) return {ok:false,errors:['Target SNR is at or above the shared-noise ceiling. Reduce the target or revise the calibrated noise floor.']};
    let best=null; const candidates=[];
    for (let n=c.minProjections;n<=p.maxProjections;n++) {
      const row=candidate(p,n,c);
      if (row) { candidates.push(row); if (!best || row.total<best.total-1e-9) best=row; }
    }
    if (!best) return {ok:false,errors:['No feasible plan within the exposure, count and projection limits. Increase maximum exposure or maximum projections, or reduce the target.']};
    const warnings=['Planning estimate only. Default calibration is illustrative; no experimental validation is claimed.'];
    if (best.counts<100) warnings.push('Low counts: the log-transmission variance approximation may be inaccurate. Consider a higher count floor.');
    if (p.transmission>95) warnings.push('Near-unity transmission gives a very small attenuation signal. This SNR is not a feature-contrast SNR.');
    if (p.overhead===0 && p.readNoise===0) warnings.push('With zero overhead and zero read noise, multiple plans can tie; the lowest projection count is selected.');
    return {ok:true,best,candidates,...c,warnings};
  }
  const api={validate,constants,snr,candidate,optimize}; root.TomoPhysics=api;
  if (typeof module !== 'undefined') module.exports=api;
})(typeof window !== 'undefined' ? window : globalThis);
