// Poder PvE no nível, pela mesma fórmula do código público do jogo (shared/ginasios.mjs).
(() => {
 'use strict';
 const KEYS=['hp','atk','def','spAtk','spDef','speed'];
 const LEGENDARY=new Set([144,145,146,150,243,244,245,249,250,151,251,494,377,378,379,380,381,382,383,384,480,481,482,483,484,485,486,487,488,638,639,640,641,642,643,644,645,646,716,717,718,785,786,787,788,789,790,791,792,793,794,795,796,797,798,799,800,803,804,805,806,888,889,890,891,892,894,895,896,897,898,905,1001,1002,1003,1004,1007,1008,1009,1010,1014,1015,1016,1017,1020,1021,1022,1023,1024,385,386,489,490,491,492,493,647,648,649,719,720,721,801,802,807,808,809,893,1025]);
 const legendary=id=>LEGENDARY.has(id>=13000?id%1000:id>=3000&&id<4000?id-3000:id);
 const on=v=>v===true||v===1||v==='true';
 function calcular(p,e,price,currency){
  if(!p||!e||!Array.isArray(e.b)||e.b.length!==6||!e.b.every(Number.isFinite)||!Number.isInteger(p.level)||p.level<1||p.level>9999||!Number.isInteger(p.potencia)||p.potencia<1||p.potencia>5||!Number.isFinite(p.quality)||p.quality<.8||p.quality>1.8||!KEYS.every(k=>Number.isInteger(p.ivs?.[k])&&p.ivs[k]>=1&&p.ivs[k]<=32))return null;
  let refino=p.refino;
  if(typeof refino==='string'){try{refino=JSON.parse(refino);}catch{return null;}}
  const multiplier=[1,1.05,1.1,1.25,2][p.potencia-1]*(on(p.shiny)?3:1)*(legendary(e.id)?4:1),stats={};
  for(const [i,k]of KEYS.entries()){
   const refine=k==='speed'?0:Math.max(0,Math.min(9999,Math.floor(Number(refino?.[k])||0)));
   stats[k]=Math.round((e.b[i]+refine+2*p.ivs[k])*(p.level/100)*Math.pow(p.quality,k==='hp'||k==='speed'?.95:.8)*multiplier);
  }
  const basic={name:'Investida',power:30,cooldownMs:2000,category:'PHYSICAL'};
  const moves=(e.m||[]).filter(m=>(m[5]??1)<=p.level).map(m=>({name:m[0],type:m[1],category:m[2]===1?'SPECIAL':'PHYSICAL',power:m[3],cooldownMs:m[4]}));
  if(p.tmElemental)moves.push({name:'TM '+p.tmElemental,type:p.tmElemental,category:'SPECIAL',power:2800,cooldownMs:60000});
  let move=basic,best=-1;
  for(const g of moves){const special=g.category==='SPECIAL',attack=special?stats.spAtk:stats.atk,defense=special?stats.spDef:stats.def,stab=e.t.includes(g.type)?1.5:1;
   const score=(((2*p.level/5+2)*(g.power??0)*(attack/Math.max(1,defense)))/50+2)*stab;
   if(score>best){best=score;move=g;}
  }
  const dps=((2*p.level/5+2)*(move.power??30)*Math.max(stats.atk,stats.spAtk))/50/(Math.max(400,move.cooldownMs??2000)/1000);
  const combatHP=Math.max(24,Math.round(stats.hp*12));
  const power=Math.max(1,Math.round(dps*combatHP*((stats.def+stats.spDef)/2)/1e7));
  return {power,perGem:currency==='orb'&&Number.isFinite(price)&&price>0?power/price:null,stats,combatHP,move:move.name};
 }
 function normalizar(p,e,price,currency){
  const current=calcular(p,e,price,currency);if(!current)return null;
  const normalized=p.level===100?current:calcular({...p,level:100},e,price,currency);
  return {...normalized,referenceLevel:100,currentPower:current.power,currentLevel:p.level,currentMove:current.move};
 }
 window.PokeIdlePvePower={calcular,normalizar};
})();
