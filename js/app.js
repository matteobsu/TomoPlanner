(function () {
  'use strict';
  const $=id=>document.getElementById(id);
  const fmt=(n,d=4)=>Number(n.toPrecision(d)).toLocaleString('en-US',{maximumSignificantDigits:d});
  const duration=t=>t>=3600?`${fmt(t/3600)} h`:`${fmt(t/60)} min`;
  let last=null;
  for(const f of TomoModels.fields) {
    const label=document.createElement('label'); label.className='field';
    const title=document.createElement('span');title.textContent=f.label;
    const wrap=document.createElement('div');wrap.className='input-with-unit';
    const input=document.createElement('input');Object.assign(input,{id:f.key,name:f.key,type:'number',value:f.optional?'':f.value,min:f.min,max:f.max,step:['maxProjections','flatFrames'].includes(f.key)?'1':'any',required:!f.optional});
    if(f.optional) input.placeholder=f.value===null?'Optional':`Blank → ${f.value}`;
    input.setAttribute('aria-describedby','errors');
    const unit=document.createElement('span');unit.className='unit';unit.textContent=f.unit;
    wrap.append(input,unit);label.append(title,wrap);$(f.group).append(label);
  }
  const raw=()=>Object.fromEntries(TomoModels.fields.map(f=>[f.key,$(f.key).value.trim()===''?(f.optional?null:NaN):Number($(f.key).value)]));
  const read=()=>TomoModels.resolve(raw());
  function inspect(n) {
    if(!last) return;
    const p=last.inputs,r=TomoPhysics.candidate(p,n);
    if(!Number.isInteger(n)||n<last.result.minProjections||n>p.maxProjections||!r) { $('inspection').textContent='This projection count is outside the feasible range.';return; }
    $('inspect').value=n;
    $('inspection').textContent=`${n} projections · ${fmt(r.exposure)} s each · ${fmt(r.angle)}° increments · estimated SNR ${fmt(r.snr)} · ${duration(r.total)} total`;
  }
  function update() {
    const p=read(),r=TomoPhysics.optimize(p);last=null;
    for(const f of TomoModels.fields) $(f.key).setAttribute('aria-invalid',String(!(f.optional&&p[f.key]===null)&&(!Number.isFinite(p[f.key])||p[f.key]<f.min||p[f.key]>f.max||(['maxProjections','flatFrames'].includes(f.key)&&!Number.isInteger(p[f.key]))||(f.key==='pixel'&&p.pixel*2>p.resolution))));
    $('errors').replaceChildren();$('errors').hidden=r.ok;$('export').disabled=!r.ok;$('inspect').disabled=!r.ok;
    if(!r.ok) {
      r.errors.forEach(e=>{const el=document.createElement('p');el.textContent=e;$('errors').append(el);});
      $('results').replaceChildren();$('warnings').replaceChildren();$('inspection').textContent='Resolve the input or feasibility errors to inspect a plan.';TomoPlot.clear();return;
    }
    last={inputs:p,result:r};const b=r.best;
    $('results').innerHTML=`<div class="metrics">${[
      ['Optimal projections',fmt(b.projections,8),'angular minimum: '+r.minProjections],
      ['Exposure / projection',fmt(b.exposure)+' s','shortest feasible exposure'],
      ['Total acquisition time',duration(b.total),'includes '+duration(b.projections*p.overhead)+' overhead'],
      ['Angular increment',fmt(b.angle)+'°','180° coverage, endpoint excluded'],
      ['Predicted reconstructed SNR',fmt(b.snr),'model estimate · target '+fmt(p.target)],
      ['Detected neutrons / pixel',fmt(b.counts),'expected detected neutron-equivalents / projection'],
      ...(r.digitization?[['Sample gray signal / pixel',fmt(b.sampleGray)+' ADU','above dark · per projection']]:[])
    ].map(([label,value,note],i)=>`<div class="metric ${i<3?'primary':''}"><span>${label}</span><strong>${value}</strong><small>${note}</small></div>`).join('')}</div><p class="detail-line">Detected transmitted rate: ${fmt(r.rate)} neutron-equivalents/pixel/s · ${r.candidates.length.toLocaleString()} feasible integer plans evaluated · acquisition only; flat/dark reference scans excluded.</p><p class="detail-line">${TomoModels.fields.filter(f=>f.group==='calibration').every(f=>$(f.key).value.trim()==='')?'Standard planning: advanced calibration left blank; k = 1, F = 1, read noise = 0 and shared noise floor = 0.':'Advanced overrides applied; all blank calibration fields retain their ideal standard assumptions.'} ${r.digitization?'Gray-level quantization estimate included.':'Gray-level quantization not estimated.'}</p>`;
    $('warnings').replaceChildren();r.warnings.slice(1).forEach(w=>{const el=document.createElement('p');el.textContent=w;$('warnings').append(el);});
    Object.assign($('inspect'),{min:r.candidates[0].projections,max:p.maxProjections,value:b.projections});
    inspect(b.projections);TomoPlot.render(r,p,inspect);
  }
  $('parameters').addEventListener('submit',e=>e.preventDefault());
  $('parameters').addEventListener('input',e=>{if(e.target.id==='calibrationNote')return;update();});
  $('inspect').addEventListener('input',()=>inspect(Number($('inspect').value)));
  $('reset').addEventListener('click',()=>{TomoModels.fields.forEach(f=>$(f.key).value=f.optional?'':f.value);$('calibrationNote').value='';$('advancedCalibration').open=false;update();});
  $('export').addEventListener('click',()=>{
    if(!last)return;
    const {inputs,result}=last;
    const report={application:'TomoPlanner',version:TomoModels.version,createdAt:new Date().toISOString(),status:'Model estimate; not experimentally validated',calibrationNote:$('calibrationNote').value,enteredInputs:raw(),inputs,inputUnits:Object.fromEntries(TomoModels.fields.map(f=>[f.key,f.unit])),digitization:{included:result.digitization,sampleCoefficient:result.sampleQuantCoefficient,sharedFlatVariance:result.flatQuantVariance,sharedReconstructedVariance:result.sharedVariance},optimal:result.best,outputUnits:{exposure:'s',angle:'degrees',total:'s',counts:'detected neutron-equivalents/pixel/projection',sampleGray:'ADU above dark/pixel/projection',snr:'dimensionless'},angularMinimum:result.minProjections,model:'L=-ln(T); q=flux*(pixel_um*1e-4)^2*efficiency*T; s=I0/t0*T; vq_sample(t)=step^2/(12*(s*t)^2); vq_flat=step^2/(12*M*I0^2); variance=k^2*((F/(q*t)+(readNoise/(q*t))^2+vq_sample(t))/N+vq_flat)+floor^2; quantization terms are zero when ADU inputs are blank; SNR=L/sqrt(variance)',assumptions:['blank advanced fields use k=1, F=1, readNoise=0, floor=0, without experimental calibration','180 degree parallel beam','resolution is full spatial period; pixel <= resolution/2','N >= ceil(pi*diameter_um/resolution_um)','calibration and reference scans excluded from total time','constant flux and representative transmission','independent projections; shared noise does not average down with N','optional quantization assumes linear unsaturated ADU response, independent rounding, shared averaged flat; excludes dark and reference Poisson/read uncertainty','no physical resolution or experimental SNR validation'],warnings:result.warnings,candidates:result.candidates};
    const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='tomoplanner-plan.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  update();
})();
