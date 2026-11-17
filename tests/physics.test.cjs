const {test}=require('node:test');
const assert=require('node:assert/strict');
const {defaults}=require('../js/models.js');
// Fixed analytical fixture, independent of the app's editable example defaults.
const d={...defaults,transmission:30,diameter:10,efficiency:50};
const P=require('../js/physics.js');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9*Math.max(1,Math.abs(b)),`${a} != ${b}`);
test('large-sample default plan is feasible within projection limits',()=>{
  const r=P.optimize(defaults);assert.ok(r.ok);assert.equal(r.minProjections,4713);
  near(r.rate,125);assert.ok(r.best.snr>=defaults.target);assert.ok(r.best.projections<=defaults.maxProjections);
});
test('unit conversion and angular full-period convention',()=>{
  const c=P.constants(d);near(c.rate,37.5);near(c.signal,-Math.log(.3));assert.equal(c.minProjections,315);
});
test('ideal Poisson closed form, SNR target and minimum-time optimum',()=>{
  const r=P.optimize(d);assert.ok(r.ok);assert.equal(r.best.projections,315);
  const t=d.target**2/((-Math.log(.3))**2*315*37.5);
  near(r.best.exposure,Math.max(t,20/37.5));near(r.best.total,315*(r.best.exposure+2));
  assert.ok(r.best.snr>=d.target*(1-1e-12));
});
test('Poisson SNR grows as square root of time and views',()=>{
  near(P.snr(d,400,4)/P.snr(d,400,1),2);near(P.snr(d,1600,1)/P.snr(d,400,1),2);
});
test('positive quadratic solution includes read noise and shared floor',()=>{
  const p={...d,target:300,readNoise:100,excess:2,floor:.001};
  const r=P.optimize(p);assert.ok(r.ok);near(r.best.snr,p.target);
});
test('all candidates satisfy target and constraints; independent grid optimum',()=>{
  const p={...d,readNoise:20,target:100,maxExposure:5,maxProjections:1000};
  const r=P.optimize(p);assert.ok(r.ok);
  let minimum=Infinity;
  for(let n=r.minProjections;n<=p.maxProjections;n++){
    // Independent bisection instead of the analytical exposure solver.
    let lo=Math.max(p.minExposure,p.minCounts/r.rate), hi=p.maxExposure;
    if(P.snr(p,n,hi)<p.target)continue;
    for(let i=0;i<70;i++){const m=(lo+hi)/2;if(P.snr(p,n,m)>=p.target)hi=m;else lo=m;}
    minimum=Math.min(minimum,n*(hi+p.overhead));
  }
  near(r.best.total,minimum);
  for(const row of r.candidates){assert.ok(row.snr>=p.target*(1-1e-10));assert.ok(row.counts>=p.minCounts*(1-1e-10));assert.ok(row.exposure<=p.maxExposure*(1+1e-10));}
});
test('exposure cap may require more angular samples',()=>{
  const p={...d,target:200,maxExposure:1,maxProjections:5000};const r=P.optimize(p);assert.ok(r.ok);assert.ok(r.best.projections>r.minProjections);
});
test('reject invalid, empty, nonfinite, fractional and incompatible inputs',()=>{
  for(const [key,value] of [['flux',NaN],['flux',Infinity],['flux',0],['efficiency',101],['transmission',100],['pixel',51],['maxProjections',400.5],['minCounts',19],['floor',-1],['target','30']]) assert.equal(P.optimize({...d,[key]:value}).ok,false,key);
  assert.equal(P.optimize({...d,minExposure:700}).ok,false);
});
test('reports infeasible angular, exposure, count and floor constraints',()=>{
  for(const p of [{...d,maxProjections:100},{...d,target:1e6},{...d,maxExposure:.2},{...d,floor:1}]) assert.equal(P.optimize(p).ok,false);
});
test('zero-overhead ties select fewer views; count floor can overachieve target',()=>{
  const r=P.optimize({...d,overhead:0,target:100});assert.ok(r.ok);assert.equal(r.best.projections,r.minProjections);
  assert.ok(P.optimize({...d,target:1}).best.snr>1);
});
test('blank or omitted advanced parameters resolve to standard assumptions',()=>{
  const p={...defaults,gain:'',excess:null,readNoise:undefined,floor:'  '};
  const r=P.optimize(p),baseline=P.optimize(defaults);
  assert.ok(r.ok);near(r.best.snr,baseline.best.snr);near(r.best.total,baseline.best.total);
  assert.equal(P.optimize({...p,gain:NaN}).ok,false);
});
test('gray values add sample rounding and non-averaging flat uncertainty in quadrature',()=>{
  const p={...d,openBeamGray:100,grayExposure:2,quantStep:2,flatFrames:4,gain:3,readNoise:2,floor:.001};
  const n=400,t=5,q=37.5,L=-Math.log(.3),sampleADU=100*.3*t/2;
  const expectedVariance=9*((1/(q*t)+(2/(q*t))**2+4/(12*sampleADU**2))/n+4/(12*4*100**2))+.001**2;
  near(P.snr(p,n,t),L/Math.sqrt(expectedVariance));
  assert.ok(P.snr(p,n,t)<P.snr({...p,openBeamGray:null,grayExposure:null},n,t));
});
test('more flat frames reduce only the shared quantization variance',()=>{
  const p={...d,openBeamGray:100,grayExposure:1};
  const a=P.constants(p),b=P.constants({...p,flatFrames:4});
  near(b.flatQuantVariance,a.flatQuantVariance/4);near(b.sampleQuantCoefficient,a.sampleQuantCoefficient);
  assert.ok(P.snr({...p,flatFrames:4},400,10)>P.snr(p,400,10));
});
test('quantization-aware optimizer matches independent bisection search',()=>{
  const p={...d,target:100,readNoise:20,openBeamGray:80,grayExposure:1,quantStep:2,flatFrames:8,maxExposure:10,maxProjections:1000};
  const r=P.optimize(p);assert.ok(r.ok);let minimum=Infinity;
  const independentSNR=(n,t)=>{
    const signal=-Math.log(.3),count=37.5*t,I=80*.3*t;
    return signal/Math.sqrt((1/count+(20/count)**2+4/(12*I**2))/n+4/(12*8*80**2));
  };
  for(let n=315;n<=1000;n++){
    let lo=Math.max(.1,20/37.5),hi=10;if(independentSNR(n,hi)<100)continue;
    for(let j=0;j<70;j++){const t=(lo+hi)/2;if(independentSNR(n,t)>=100)hi=t;else lo=t;}
    minimum=Math.min(minimum,n*(hi+2));
  }
  near(r.best.total,minimum);near(independentSNR(r.best.projections,r.best.exposure),r.best.snr);
});
test('shared quantization sets a ceiling; partial, invalid and fractional gray inputs fail',()=>{
  assert.equal(P.optimize({...d,openBeamGray:10,grayExposure:1,target:1000}).ok,false);
  for(const values of [{openBeamGray:100},{grayExposure:1},{openBeamGray:0,grayExposure:1},{openBeamGray:100,grayExposure:1,quantStep:0},{flatFrames:1.5}])
    assert.equal(P.optimize({...d,...values}).ok,false,JSON.stringify(values));
});
test('large gray signals approach no-quantization model without changing neutron count rate',()=>{
  const p={...d,openBeamGray:1e9,grayExposure:1};
  near(P.snr(p,315,1),P.snr(d,315,1));near(P.constants(p).rate,P.constants(d).rate);
});
