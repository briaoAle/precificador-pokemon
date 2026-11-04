// Nota da Calculadora (0 a 10 dentro da espécie), pela fórmula do código público do jogo (shared/nota-pokemon.mjs),
// sem refino. Uma espécie evoluída nunca tem nota menor que a das anteriores: cada passo de evolução vale +0,1 sobre a
// nota calculada com os status base da anterior. O site usa para a trava de nota mínima (3,5) na última evolução.
(function(root){
 'use strict';
 const STATS=['hp','atk','def','spAtk','spDef','speed'],EXPONENT=[.95,.8,.8,.8,.8,.95],POTENCIA=[0,.05,.1,.25,1];
 const round=n=>Math.round(n*1000)/1000,clamp=n=>Math.min(1,Math.max(0,n)),all=n=>Object.fromEntries(STATS.map(k=>[k,n]));
 // Soma dos status de nascimento (Nv 100), na régua da nota.
 const birth=(base,p)=>base.reduce((sum,v,i)=>sum+Math.round((v+2*p.ivs[STATS[i]])*p.quality**EXPONENT[i]*(1+POTENCIA[p.potencia-1])*(p.shiny?3:1)),0);
 const NEUTRAL=Array(6).fill(80),WORST={ivs:all(1),quality:.8,potencia:1,shiny:false},BEST={ivs:all(32),quality:1.8,potencia:5,shiny:true};
 const LOW=Math.log(birth(NEUTRAL,WORST)),HIGH=Math.log(birth(NEUTRAL,BEST));
 const scale=(base,p)=>round(10*clamp((Math.log(birth(base,p))-LOW)/(HIGH-LOW)))/10;
 const grade=(base,p)=>{const min=scale(base,WORST),max=scale(base,BEST);return max>min?round(10*clamp((scale(base,p)-min)/(max-min))):0;};
 function create(species){
  const parents=new Map();
  const link=(from,to)=>{if(!parents.has(to))parents.set(to,new Set());parents.get(to).add(from);};
  // Mega conta como evolução da espécie base.
  for(const [id,e]of species){for(const child of e.evo||[])link(id,child);const base=e.megaBase??(id>=3000&&id<4000&&/^Mega /i.test(e.n)?id-3000:null);if(species.has(base))link(base,id);}
  // Nota de um Pokémon (p: ivs, quality, potencia, shiny) como se fosse da espécie id.
  function nota(id,p){
   const e=species.get(Number(id));if(!e?.b||!STATS.every(k=>Number.isInteger(p.ivs?.[k]))||!(p.quality>0)||!(p.potencia>=1&&p.potencia<=5))return null;
   let best=grade(e.b,p),layer=[...(parents.get(e.id)||[])];const seen=new Set([e.id]);
   for(let step=1;step<=12&&layer.length;step++){const next=[];
    for(const a of layer){if(seen.has(a))continue;seen.add(a);const s=species.get(a);if(s?.b)best=Math.max(best,Math.min(10,grade(s.b,p)+step*.1));next.push(...(parents.get(a)||[]));}
    layer=next;}
   return round(best);
  }
  return {nota};
 }
 root.PokeIdleNota={create,MIN:3.5};
})(typeof window==="object"?window:globalThis);
