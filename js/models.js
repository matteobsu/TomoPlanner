(function (root) {
  'use strict';
  const fields = [
    ['beam','flux','Neutron flux','n/cm²/s',1e7,1e-6,1e15],
    ['beam','resolution','Required resolution (full period)','µm',100,0.01,1e6],
    ['beam','transmission','Average sample transmission','%',50,0.001,99.999],
    ['beam','pixel','Effective pixel size','µm',50,0.001,1e5],
    ['beam','target','Target reconstructed SNR','',30,0.01,1e6],
    ['beam','diameter','Sample diameter','mm',150,0.001,1e4],
    ['beam','efficiency','Detector efficiency','%',100,0.001,100],
    ['calibration','gain','Reconstruction noise gain k','',1,0.0001,1e4],
    ['calibration','excess','Detector excess variance factor F','',1,1,1e4],
    ['calibration','readNoise','Read noise (equivalent detected neutrons RMS)','neutrons',0,0,1e6],
    ['calibration','floor','Shared reconstructed noise floor σ₀','',0,0,10],
    ['limits','overhead','Overhead per projection','s',2,0,86400],
    ['limits','minExposure','Minimum exposure','s',0.1,0.0001,86400],
    ['limits','maxExposure','Maximum exposure','s',600,0.0001,86400],
    ['limits','maxProjections','Maximum projections','',5000,2,20000],
    ['limits','minCounts','Minimum detected neutrons / pixel','',20,20,1e8],
    ['digitization','openBeamGray','Open-beam signal above dark','ADU',null,0.000001,1e12],
    ['digitization','grayExposure','Exposure of that open-beam image','s',null,0.0001,86400],
    ['digitization','quantStep','Digitization step (1 LSB)','ADU',1,0.000001,1e9],
    ['digitization','flatFrames','Open-beam frames averaged','frames',1,1,100000]
  ].map(([group,key,label,unit,value,min,max]) => ({group,key,label,unit,value,min,max,optional:group==='calibration'||group==='digitization'}));
  const defaults=Object.fromEntries(fields.map(f => [f.key,f.value]));
  const blank=value=>value==null||(typeof value==='string'&&value.trim()==='');
  function resolve(values) {
    const result={...values};
    for(const f of fields) if(f.optional&&blank(result[f.key])) result[f.key]=defaults[f.key];
    return result;
  }
  const api = {fields, defaults, resolve, blank, version:'1.1.0'};
  root.TomoModels = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
