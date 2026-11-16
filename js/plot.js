(function () {
  'use strict';
  const layout={margin:{l:65,r:65,t:30,b:55},paper_bgcolor:'rgba(0,0,0,0)',plot_bgcolor:'#fff',font:{family:'Inter, system-ui, sans-serif',color:'#17202a',size:11},hovermode:'x unified',legend:{orientation:'h',y:1.17},xaxis:{title:'Number of projections',gridcolor:'#e8edf2'},yaxis:{title:'Total acquisition time (min)',gridcolor:'#e8edf2'}};
  const config={responsive:true,displaylogo:false,modeBarButtonsToRemove:['lasso2d','select2d']};
  function render(result,p,onSelect) {
    const fallback=document.getElementById('plotFallback');
    if (!window.Plotly) { fallback.hidden=false; document.getElementById('timePlot').hidden=true; document.getElementById('snrPlot').hidden=true; return; }
    fallback.hidden=true;
    const rows=result.candidates, stride=Math.max(1,Math.ceil(rows.length/1500));
    const sampled=rows.filter((r,i)=>i%stride===0||i===rows.length-1||r.projections===result.best.projections);
    const x=sampled.map(r=>r.projections), best=result.best;
    Plotly.react('timePlot',[
      {x,y:sampled.map(r=>r.total/60),name:'Total time',mode:'lines',line:{color:'#1f4b7a',width:3},hovertemplate:'%{x} projections · %{y:.3g} min<extra></extra>'},
      {x,y:sampled.map(r=>r.exposure),name:'Required exposure',yaxis:'y2',mode:'lines',line:{color:'#3d998a',width:2},hovertemplate:'Exposure %{y:.4g} s<extra></extra>'},
      {x:[best.projections],y:[best.total/60],name:'Optimum',mode:'markers',marker:{size:11,color:'#d88a32'},hovertemplate:'Optimal: %{x} projections<extra></extra>'}
    ],{...layout,yaxis2:{title:'Exposure / projection (s)',overlaying:'y',side:'right',showgrid:false}},config);
    const times=Array.from({length:150},(_,i)=>Math.exp(Math.log(p.minExposure)+(Math.log(p.maxExposure)-Math.log(p.minExposure))*i/149));
    Plotly.react('snrPlot',[
      {x:times,y:times.map(t=>TomoPhysics.snr(p,best.projections,t)),name:'Model SNR at optimal N',mode:'lines',line:{color:'#1f4b7a',width:3}},
      {x:[p.minExposure,p.maxExposure],y:[p.target,p.target],name:'Target',mode:'lines',line:{color:'#3d998a',dash:'dash'}},
      {x:[best.exposure],y:[best.snr],name:'Selected exposure',mode:'markers',marker:{size:10,color:'#d88a32'}}
    ],{...layout,xaxis:{title:'Exposure / projection (s) · logarithmic',type:'log',gridcolor:'#e8edf2'},yaxis:{title:'Reconstructed SNR · model estimate',gridcolor:'#e8edf2'},margin:{...layout.margin,r:25}},config);
    const plot=document.getElementById('timePlot');
    plot.removeAllListeners('plotly_click');
    plot.on('plotly_click',event=>onSelect(Math.round(event.points[0].x)));
  }
  function clear() { if(window.Plotly) for(const id of ['timePlot','snrPlot']) Plotly.purge(id); }
  window.TomoPlot={render,clear};
})();
