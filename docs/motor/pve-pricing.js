// Motor do preço: vendas → curva do mercado por PvE + vendas da família (gerado por tools/exportar.cjs; não edite).
(function(root){
'use strict';
const B=root.PokeIdleMarketBonuses;
const STATS=['hp','atk','def','spAtk','spDef','speed'];
const LEVEL_BAND=.5,MIN_MARKET=30,ITEM_DAYS=3,DAY_MS=86400000,SAO_PAULO_MS=-3*3600000,LATE_READ_MS=2*3600000;
const MEGA=70014,MEGA_SHINY=70015,PER_ADDON=10;
const day=at=>new Date(at+SAO_PAULO_MS).toISOString().slice(0,10);
const yes=v=>v===true||v===1||v==='true';
const norm=s=>String(s??'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim();
function itemQuotes(itemPrices){
 const by=new Map();
 for(const r of itemPrices||[])if(r.currency==='orb'&&r.price>0){if(!by.has(r.itemId))by.set(r.itemId,[]);by.get(r.itemId).push({t:Date.parse(r.day+'T12:00:00-03:00'),price:r.price});}
 return (itemId,at)=>{let best=null;for(const q of by.get(itemId)||[]){const d=Math.abs(q.t-at);if(d<=ITEM_DAYS*DAY_MS&&(!best||d<best.d))best={d,price:q.price};}return best?.price??null;};
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
  if(STATS.some(k=>Number(s.ficha?.refino?.[k])>0)){skip('refinado');continue;}
  const d=describe(central,{...s.ficha,speciesId});if(!d){skip('ficha incompleta');continue;}
  let addons=0;for(const a of d.addons){const q=quote(a.id,s.at);if(q==null){addons=null;break;}addons+=q*a.quantity;}
  if(addons==null){skip('sem cotação dos Adicionais');continue;}
  const base=s.price-addons;if(!(base>0)){skip('Adicionais acima do preço');continue;}
  const uncertain=(!!s.ficha?.tmElemental||yes(s.ficha?.tmAoe))&&!(s.readAt>=s.at&&s.readAt-s.at<=LATE_READ_MS);
  rows.push({at:s.at,price:s.price,base,logBase:Math.log(base),addons,hasAddons:d.addons.length>0,mega:d.addons.some(a=>a.id===MEGA||a.id===MEGA_SHINY),pve:d.pve,family:d.family,familyName:d.familyName,shiny:d.shiny,level:d.level,speciesId,name:s.name,uncertain});
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
const MODEL={k:5,variant:'curve'};
function priceSheet(central,sheet,{rows,itemPrices=[],currentItems={},now=Date.now()}){
 const speciesId=speciesLookup(central)(null,sheet?.nome);
 if(speciesId==null)throw Error(`Espécie não reconhecida: ${String(sheet?.nome||'').slice(0,60)}.`);
 if(!STATS.every(k=>Number.isInteger(sheet.ivs?.[k])))throw Error('A ficha precisa dos 6 IVs para calcular o PvE.');
 const refined=Object.keys(sheet.refinoActual||{}).length>0;
 const target=describe(central,{speciesId,level:sheet.level,potencia:sheet.potencia,quality:sheet.quality,shiny:sheet.shiny===true,ivs:sheet.ivs,tmElemental:sheet.tmElemental||null,tmAoe:sheet.tmAoe===true,refino:{}});
 if(!target)throw Error('Não foi possível calcular o PvE desta ficha.');
 const quote=itemQuotes(itemPrices),parts=target.addons.map(a=>{const current=Number(currentItems?.[a.id]),unit=current>0?current:quote(a.id,now);return {label:a.label,quantity:a.quantity,unit:unit??null,total:unit!=null?Math.round(unit*a.quantity):null};});
 const known=parts.reduce((s,p)=>s+(p.total||0),0),e=estimate(target,rows,{...MODEL,addons:known});
 const species=central.species.get(speciesId);
 const result={name:species.n,speciesId,types:species.t||[],family:target.familyName,familyId:target.family,shiny:target.shiny,pve:target.pve,level:target.level,refined,parts,missing:parts.filter(p=>p.total==null).map(p=>p.label)};
 if(!e)return {...result,available:false};
 const comps=rows.filter(r=>r.family===target.family&&r.shiny===target.shiny).sort((a,b)=>b.at-a.at).slice(0,8).map(r=>({at:r.at,price:r.price,base:Math.round(r.base),level:r.level,speciesId:r.speciesId,name:r.name,shiny:r.shiny,uncertain:r.uncertain===true,types:central.species.get(r.speciesId)?.t||[]}));
 return {...result,available:true,low:e.low,median:e.median,high:e.high,base:Math.round(e.base),weight:e.weight,familyCount:e.familyCount,marketCount:e.marketCount,uncertain:e.uncertain,comps};
}
root.PokeIdlePvePricing={describe,prepare,estimate,priceSheet,pav,at,itemQuotes,day,MEGA,MEGA_SHINY,MODEL};
})(window);
