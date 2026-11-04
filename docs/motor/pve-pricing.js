// Motor do preço: vendas → curva do mercado por PvE + vendas da família (gerado automaticamente; não edite).
(function(root){
'use strict';
const B=root.PokeIdleMarketBonuses;
const STATS=['hp','atk','def','spAtk','spDef','speed'];
const LEVEL_BAND=.5,MIN_MARKET=30,ITEM_DAYS=3,FAR_ITEM_DAYS=5,DAY_MS=86400000,SAO_PAULO_MS=-3*3600000,LATE_READ_MS=2*3600000;
const MEGA=70014,MEGA_SHINY=70015,PER_ADDON=10;
const day=at=>new Date(at+SAO_PAULO_MS).toISOString().slice(0,10);
const yes=v=>v===true||v===1||v==='true';
const norm=s=>String(s??'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim();
function itemQuotes(itemPrices){
 const by=new Map();
 for(const r of itemPrices||[])if(r.currency==='orb'&&r.price>0){if(!by.has(r.itemId))by.set(r.itemId,[]);by.get(r.itemId).push({t:Date.parse(r.day+'T12:00:00-03:00'),price:r.price});}
 const near=(itemId,at,maxDays)=>{let best=null;for(const q of by.get(itemId)||[]){const d=Math.abs(q.t-at);if(d<=maxDays*DAY_MS&&(!best||d<best.d))best={d,price:q.price};}return best&&{price:best.price,far:best.d>ITEM_DAYS*DAY_MS};};
 const quote=(itemId,at)=>near(itemId,at,ITEM_DAYS)?.price??null;quote.near=near;return quote;
}
function speciesLookup(central){const byName=new Map();for(const e of central.species.values())if(!byName.has(norm(e.n)))byName.set(norm(e.n),e.id);return (id,name)=>central.species.has(Number(id))?Number(id):byName.get(norm(name))??null;}
const megaBase=(central,e)=>e?.megaBase??(e&&e.id>=3000&&e.id<4000&&/^Mega /i.test(e.n)?e.id-3000:null);
function describe(central,p){
 if(!p||!STATS.every(k=>Number.isInteger(p.ivs?.[k])&&p.ivs[k]>=1&&p.ivs[k]<=32)||!Number.isFinite(p.quality)||!Number.isInteger(p.potencia)||!(p.level>0))return null;
 if(STATS.some(k=>Number(p.refino?.[k])>0))return null;
 const e=central.species.get(Number(p.speciesId));if(!e)return null;
 const base=megaBase(central,e),mega=central.species.has(base);
 const clean={...B.clean(p),refino:{},speciesId:mega?base:e.id},final=central.evaluate(clean,false).final;
 if(!final?.pve||final.pve<=0)return null;
 const addons=[];
 if(p.tmElemental)addons.push({id:B.Z_FRAGMENT,label:'Z-Move '+String(p.tmElemental).toUpperCase(),quantity:PER_ADDON});
 if(yes(p.tmAoe))addons.push({id:B.AOE_FRAGMENT,label:'AoE',quantity:PER_ADDON});
 if(mega)addons.push({id:p.shiny===true?MEGA_SHINY:MEGA,label:p.shiny===true?'Mega Shiny':'Mega',quantity:PER_ADDON});
 return {pve:final.pve,family:final.id,familyName:final.name,shiny:p.shiny===true,level:p.level,addons};
}
function prepare(central,sales,itemPrices){
 const quote=itemQuotes(itemPrices),find=speciesLookup(central),rows=[],skipped={};
 const skip=r=>{skipped[r]=(skipped[r]||0)+1;};
 for(const s of sales){
  if(s.currency!=='orb'){skip('coins');continue;}
  const speciesId=find(s.speciesId??s.ficha?.speciesId,s.name);if(speciesId==null){skip('espécie desconhecida');continue;}
  const refined=STATS.some(k=>Number(s.ficha?.refino?.[k])>0);
  const d=describe(central,{...s.ficha,refino:{},speciesId});if(!d){skip('ficha incompleta');continue;}
  let addons=0,far=false;for(const a of d.addons){const q=quote.near(a.id,s.at,FAR_ITEM_DAYS);if(!q){addons=null;break;}addons+=q.price*a.quantity;far||=q.far;}
  if(addons==null){skip('sem cotação dos Adicionais');continue;}
  const base=s.price-addons;if(!(base>0)){skip('Adicionais acima do preço');continue;}
  const uncertain=far||(!!s.ficha?.tmElemental||yes(s.ficha?.tmAoe))&&!(s.readAt>=s.at&&s.readAt-s.at<=LATE_READ_MS);
  rows.push({at:s.at,price:s.price,base,logBase:Math.log(base),addons,hasAddons:d.addons.length>0,mega:d.addons.some(a=>a.id===MEGA||a.id===MEGA_SHINY),pve:d.pve,family:d.family,familyName:d.familyName,shiny:d.shiny,level:d.level,speciesId,name:s.name,nota:Number.isFinite(s.ficha?.nota)?s.ficha.nota:null,uncertain,refined});
 }
 return {rows,skipped};
}
function pav(points){
 const sorted=[...points].sort((a,b)=>a.x-b.x),blocks=[];
 for(const p of sorted){blocks.push({sum:p.y,n:1,lo:p.x,hi:p.x});while(blocks.length>1){const b=blocks.at(-1),a=blocks.at(-2);if(a.sum/a.n<=b.sum/b.n)break;a.sum+=b.sum;a.n+=b.n;a.hi=b.hi;blocks.pop();}}
 return blocks.map(b=>({lo:b.lo,hi:b.hi,y:b.sum/b.n}));
}
function at(curve,x){
 if(!curve.length)return null;
 const mid=c=>(c.lo+c.hi)/2;if(x<=mid(curve[0]))return curve[0].y;const last=curve.at(-1);if(x>=mid(last))return last.y;
 for(let i=0;i<curve.length-1;i++){const a=curve[i],b=curve[i+1];if(x<=mid(b)){const t=(x-mid(a))/(mid(b)-mid(a));return a.y+t*(b.y-a.y);}}
 return last.y;
}
const nearLevel=(a,b)=>Math.abs(Math.log2(a/b))<=LEVEL_BAND;
const quantile=(xs,q)=>{const s=[...xs].sort((a,b)=>a-b),n=(s.length-1)*q,i=Math.floor(n);return s[i]+(s[Math.ceil(n)]-s[i])*(n-i);};
function estimate(target,rows,{k=5,variant='factor',addons=0}={}){
 if(!target||addons==null)return null;
 const sameShiny=rows.filter(r=>r.shiny===target.shiny),near=sameShiny.filter(r=>nearLevel(r.level,target.level)),market=near.length>=MIN_MARKET?near:sameShiny;
 if(market.length<3)return null;
 const curve=pav(market.map(r=>({x:r.pve,y:r.logBase}))),m=at(curve,target.pve);
 const familyAll=sameShiny.filter(r=>r.family===target.family),familyNear=familyAll.filter(r=>nearLevel(r.level,target.level)),family=familyNear.length>=3?familyNear:familyAll;
 const residuals=family.map(r=>r.logBase-at(curve,r.pve)),n=family.length,w=k===Infinity||!n?0:n/(n+k);
 let center=m,speciesPart=null;
 if(variant==='curve'){if(n>=3){speciesPart=at(pav(family.map(r=>({x:r.pve,y:r.logBase}))),target.pve);center=(1-w)*m+w*speciesPart;}}
 else if(n){speciesPart=residuals.reduce((s,x)=>s+x,0)/n;center=m+w*speciesPart;}
 const weight=variant==='curve'&&n<3?0:w;
 const spread=n>=8?residuals.map(x=>x-(variant==='factor'?speciesPart:0)):market.map(r=>r.logBase-at(curve,r.pve));
 const lo=quantile(spread,.25)-quantile(spread,.5),hi=quantile(spread,.75)-quantile(spread,.5);
 const price=x=>Math.max(1,Math.round(Math.exp(x)+addons));
 return {low:price(center+lo),median:price(center),high:price(center+hi),base:Math.exp(center),addons,weight,familyCount:n,marketCount:market.length,familyName:target.familyName,
  sources:{family:family.length,market:market.length,levelNear:near.length>=MIN_MARKET},
  uncertain:{family:family.filter(r=>r.uncertain).length,market:market.filter(r=>r.uncertain).length}};
}
const NEIGHBORS={layers:[1,.2,.05,.01],levelSigma:1.5,pveSigma:.15,halfLifeDays:14,minWeight:1e-5,bias:Math.log(1.09),refinedWeight:.5};
const CONFIDENCE={weights:[-2.64,.66,.68,1.53,.85],keys:['proximidade','certeza','consistencia','ampliacao']};
function marketLine(points){
 const n=points.length,m=k=>points.reduce((s,p)=>s+p[k],0)/n,mx=m('x'),ml=m('l'),my=m('y');let xx=0,ll=0,xl=0,xy=0,ly=0;
 for(const p of points){const dx=p.x-mx,dl=p.l-ml,dy=p.y-my;xx+=dx*dx;ll+=dl*dl;xl+=dx*dl;xy+=dx*dy;ly+=dl*dy;}
 const det=xx*ll-xl*xl;let b=det>1e-9?(xy*ll-ly*xl)/det:0,c=det>1e-9?(ly*xx-xy*xl)/det:0;
 if(b<0){b=0;c=ll>1e-9?Math.max(0,ly/ll):0;}if(c<0){c=0;b=xx>1e-9?Math.max(0,xy/xx):0;}
 return (x,l)=>my+b*(x-mx)+c*(l-ml);
}
function weightedQuantile(points,q){const s=[...points].sort((a,b)=>a.v-b.v),total=s.reduce((t,p)=>t+p.w,0);let acc=0;for(const p of s){acc+=p.w;if(acc>=q*total)return p.v;}return s.at(-1).v;}
function confidence(parts,weights=CONFIDENCE.weights){
 const x=CONFIDENCE.keys.map(k=>parts[k]),z=weights[0]+x.reduce((s,v,i)=>s+weights[i+1]*v,0),chance=1/(1+Math.exp(-z));
 const lowest=CONFIDENCE.keys.map((k,i)=>({k,loss:weights[i+1]*(1-x[i])})).sort((a,b)=>b.loss-a.loss)[0].k;
 return {chance,percent:Math.min(90,Math.max(10,Math.round(chance*10)*10)),lowest};
}
function influence(pts,W){const by=new Map();for(const p of pts)if(p.layer===0)by.set(p.r,(by.get(p.r)||0)+p.w);return [...by].map(([r,w])=>({r,share:w/W,closeness:w})).sort((a,b)=>b.share-a.share).slice(0,30);}
function neighbors(target,rows,{addons=0,typesOf=()=>[],megaUnit=()=>0,weights,cfg=NEIGHBORS,bias=cfg.bias??0}={}){
 if(!target||addons==null)return null;
 const same=rows.filter(r=>r.shiny===target.shiny),near=same.filter(r=>nearLevel(r.level,target.level)),market=near.length>=MIN_MARKET?near:same;
 if(market.length<3)return null;
 const fit=marketLine(same.map(r=>({x:Math.log(r.pve),l:Math.log(r.level),y:r.logBase}))),mine=typesOf(target.family);
 const layerOf=r=>{if(r.family===target.family)return 0;const t=typesOf(r.family);if(mine.length&&t.length===mine.length&&mine.every(x=>t.includes(x)))return 1;return mine.some(x=>t.includes(x))?2:3;};
 const at=target.at??Date.now(),pts=[];
 for(const r of same){
  const layer=layerOf(r),w=(r.refined?cfg.refinedWeight??1:1)*cfg.layers[layer]*Math.exp(-((Math.log(r.level/target.level)/cfg.levelSigma)**2)/2)*Math.exp(-((Math.log(r.pve/target.pve)/cfg.pveSigma)**2)/2)*.5**((at-r.at)/(cfg.halfLifeDays*DAY_MS));
  if(!(w>=cfg.minWeight))continue;const expected=fit(Math.log(r.pve),Math.log(r.level)),uncertain=r.uncertain===true;
  if(!uncertain){pts.push({v:r.logBase-expected,w,layer,uncertain,r});continue;}
  const plain=Math.max(1,r.price-(r.mega?PER_ADDON*megaUnit(r.shiny,r.at):0));
  pts.push({v:r.logBase-expected,w:w/2,layer,uncertain,r},{v:Math.log(plain)-expected,w:w/2,layer,uncertain,r});
 }
 if(!pts.length)return null;
 const mid=weightedQuantile(pts,.5),lo=weightedQuantile(pts,.25)-mid,hi=weightedQuantile(pts,.75)-mid,center=fit(Math.log(target.pve),Math.log(target.level))+mid-bias;
 const price=x=>Math.max(1,Math.round(Math.exp(x)+addons)),sum=f=>pts.filter(f).reduce((s,p)=>s+p.w,0),W=sum(()=>true);
 const close=pts.filter(p=>p.layer<=1),cw=close.reduce((s,p)=>s+p.w,0),neff=cw?cw**2/close.reduce((s,p)=>s+p.w*p.w,0):0;
 const parts={proximidade:neff/(neff+5),certeza:sum(p=>!p.uncertain)/W,consistencia:Math.exp(-(hi-lo)),ampliacao:sum(p=>p.layer===0)/W};
 const family=same.filter(r=>r.family===target.family);
 return {low:price(center+lo),median:price(center),high:price(center+hi),rawMedian:price(center+bias),base:Math.exp(center),addons,weight:parts.ampliacao,familyCount:family.length,marketCount:same.length,
  parts,confidence:confidence(parts,weights),influence:influence(pts,W),uncertain:{family:family.filter(r=>r.uncertain).length,market:same.filter(r=>r.uncertain).length}};
}
const MODEL={k:5,variant:'curve'};
function priceSheet(central,sheet,{rows,itemPrices=[],currentItems={},now=Date.now(),confidenceWeights,bias}){
 const speciesId=speciesLookup(central)(null,sheet?.nome);
 if(speciesId==null)throw Error(`Espécie não reconhecida: ${String(sheet?.nome||'').slice(0,60)}.`);
 if(!STATS.every(k=>Number.isInteger(sheet.ivs?.[k])))throw Error('A ficha precisa dos 6 IVs para calcular o PvE.');
 const refined=Object.keys(sheet.refinoActual||{}).length>0;
 const target=describe(central,{speciesId,level:sheet.level,potencia:sheet.potencia,quality:sheet.quality,shiny:sheet.shiny===true,ivs:sheet.ivs,tmElemental:sheet.tmElemental||null,tmAoe:sheet.tmAoe===true,refino:{}});
 if(!target)throw Error('Não foi possível calcular o PvE desta ficha.');
 const quote=itemQuotes(itemPrices),parts=target.addons.map(a=>{const current=Number(currentItems?.[a.id]),unit=current>0?current:quote(a.id,now);return {label:a.label,quantity:a.quantity,unit:unit??null,total:unit!=null?Math.round(unit*a.quantity):null};});
 const known=parts.reduce((s,p)=>s+(p.total||0),0),typesOf=id=>central.species.get(id)?.t||[],megaUnit=(shiny,at)=>quote(shiny?MEGA_SHINY:MEGA,at)??0;
 const e=neighbors({...target,at:now},rows,{addons:known,typesOf,megaUnit,weights:confidenceWeights,...(Number.isFinite(bias)?{bias}:{})});
 const species=central.species.get(speciesId);
 const result={name:species.n,speciesId,types:species.t||[],family:target.familyName,familyId:target.family,shiny:target.shiny,pve:target.pve,level:target.level,refined,parts,missing:parts.filter(p=>p.total==null).map(p=>p.label)};
 if(!e)return {...result,available:false};
 const comps=e.influence.map(({r,share,closeness})=>({share,closeness:Math.round(closeness*1000)/1000,at:r.at,price:r.price,base:Math.round(r.base),level:r.level,pve:Math.round(r.pve),nota:r.nota??null,speciesId:r.speciesId,name:r.name,shiny:r.shiny,uncertain:r.uncertain===true,refined:r.refined===true,types:central.species.get(r.speciesId)?.t||[]}));
 return {...result,available:true,low:e.low,median:e.median,high:e.high,base:Math.round(e.base),weight:e.weight,familyCount:e.familyCount,marketCount:e.marketCount,uncertain:e.uncertain,confidenceParts:e.parts,confidence:e.confidence,comps};
}
root.PokeIdlePvePricing={describe,prepare,estimate,neighbors,confidence,priceSheet,pav,at,itemQuotes,day,MEGA,MEGA_SHINY,MODEL,NEIGHBORS,CONFIDENCE};
})(window);
