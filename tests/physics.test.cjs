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
