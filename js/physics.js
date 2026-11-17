(function (root) {
  'use strict';
  const models = typeof module !== 'undefined' && module.exports ? require('./models.js') : root.TomoModels;
  function validate(p) {
    p=models.resolve(p);
    const errors = [];
    for (const f of models.fields) {
      if (f.optional && p[f.key]===null) continue;
      if (typeof p[f.key] !== 'number' || !Number.isFinite(p[f.key]) || p[f.key] < f.min || p[f.key] > f.max)
        errors.push(`${f.label} must be a finite number from ${f.min} to ${f.max}.`);
    }
    if (!Number.isInteger(p.maxProjections)) errors.push('Maximum projections must be an integer.');
    if (!Number.isInteger(p.flatFrames)) errors.push('Open-beam frames averaged must be an integer.');
    if ((p.openBeamGray===null)!==(p.grayExposure===null)) errors.push('To estimate digitization noise, enter both the open-beam signal in ADU and its exposure time, or leave both blank.');
    if (p.minExposure > p.maxExposure) errors.push('Minimum exposure cannot exceed maximum exposure.');
    if (p.pixel * 2 > p.resolution) errors.push('Pixel sampling is insufficient: effective pixel size must be at most half the requested full-period resolution.');
    return errors;
  }
  function constants(p) {
    p=models.resolve(p);
    const digitization=p.openBeamGray!==null&&p.grayExposure!==null;
    const grayRate=digitization?p.openBeamGray/p.grayExposure*p.transmission/100:0;
    // A shared flat's quantization uncertainty does not average down with N.
    const flatQuantVariance=digitization?(p.quantStep/p.openBeamGray)**2/(12*p.flatFrames):0;
    const sampleQuantCoefficient=digitization?(p.quantStep/grayRate)**2/12:0;
    return { rate:p.flux * (p.pixel * 1e-4) ** 2 * p.efficiency / 100 * p.transmission / 100,
      signal:-Math.log(p.transmission / 100), minProjections:Math.max(2,Math.ceil(Math.PI * p.diameter * 1000 / p.resolution)),
      digitization,grayRate,flatQuantVariance,sampleQuantCoefficient,sharedVariance:p.floor**2+p.gain**2*flatQuantVariance };
  }
  function snr(p,n,t) {
    p=models.resolve(p);
    const c=constants(p), counts=c.rate*t;
    return c.signal / Math.sqrt(p.gain ** 2 * (p.excess/counts + (p.readNoise/counts)**2+c.sampleQuantCoefficient/t**2)/n + c.sharedVariance);
  }
  function candidate(p,n,c=constants(p)) {
    p=models.resolve(p);
    const budget=(c.signal/p.target)**2-c.sharedVariance;
    if (budget <= 0) return null;
    const a=p.gain**2*p.excess/c.rate, b=(p.gain*p.readNoise/c.rate)**2+p.gain**2*c.sampleQuantCoefficient;
    const required=(a+Math.hypot(a,2*Math.sqrt(n*budget*b)))/(2*n*budget);
    const exposure=Math.max(required,p.minExposure,p.minCounts/c.rate);
    if (!Number.isFinite(exposure) || exposure > p.maxExposure*(1+1e-12)) return null;
    return {projections:n,exposure,angle:180/n,snr:snr(p,n,exposure),counts:c.rate*exposure,sampleGray:c.digitization?c.grayRate*exposure:null,total:n*(exposure+p.overhead)};
  }
  function optimize(p) {
    p=models.resolve(p);
    const errors=validate(p);
    if (errors.length) return {ok:false,errors};
    const c=constants(p);
    if (c.minProjections>p.maxProjections) return {ok:false,errors:[`Angular sampling requires at least ${c.minProjections} projections; increase the maximum.`]};
    if ((c.signal/p.target)**2<=c.sharedVariance) return {ok:false,errors:['Target SNR is at or above the shared-noise ceiling (noise floor and, if supplied, shared open-beam quantization). Reduce the target, improve the open-beam reference, or revise the noise assumptions.']};
    let best=null; const candidates=[];
    for (let n=c.minProjections;n<=p.maxProjections;n++) {
      const row=candidate(p,n,c);
      if (row) { candidates.push(row); if (!best || row.total<best.total-1e-9) best=row; }
    }
    if (!best) return {ok:false,errors:['No feasible plan within the exposure, count and projection limits. Increase maximum exposure or maximum projections, or reduce the target.']};
    const warnings=['Planning estimate only. Blank advanced fields use ideal assumptions, not measured calibration; no experimental validation is claimed.'];
    if(!c.digitization) warnings.push('Gray-level inputs are blank: digitization noise is not included. Detected neutrons and camera gray levels are different quantities.');
    else {
      warnings.push('Digitization estimate assumes linear unsaturated images, independent rounding errors, and a shared averaged open-beam reference. Dark-subtraction uncertainty and reference Poisson/read noise are not included.');
      if(best.sampleGray<10*p.quantStep||p.openBeamGray<10*p.quantStep) warnings.push('Signal is below 10 digitization steps: uniform rounding and log-error approximations may be unreliable.');
    }
    if (best.counts<100) warnings.push('Low counts: the log-transmission variance approximation may be inaccurate. Consider a higher count floor.');
    if (p.transmission>95) warnings.push('Near-unity transmission gives a very small attenuation signal. This SNR is not a feature-contrast SNR.');
    if (p.overhead===0 && p.readNoise===0 && !c.digitization) warnings.push('With zero overhead and zero read noise, multiple plans can tie; the lowest projection count is selected.');
    return {ok:true,best,candidates,...c,warnings};
  }
  const api={validate,constants,snr,candidate,optimize}; root.TomoPhysics=api;
  if (typeof module !== 'undefined') module.exports=api;
})(typeof window !== 'undefined' ? window : globalThis);
