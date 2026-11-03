// Adicionais (Z-Move e AoE) e quantos fragmentos cada um usa.
(function(root){
 'use strict';
 const DISCS={NORMAL:59200,FIRE:59201,WATER:59202,GRASS:59203,ELECTRIC:59204,ICE:59205,FIGHTING:59206,POISON:59207,GROUND:59208,FLYING:59209,PSYCHIC:59210,BUG:59211,ROCK:59212,GHOST:59213,DRAGON:59214,DARK:59215,STEEL:59216,FAIRY:59247};
 const Z_FRAGMENT=59194,AOE_FRAGMENT=40530,FRAGMENTS_PER_DISC=10,MAX_AGE=600000;
 const yes=v=>v===true||v===1||v==='true';
 const has=p=>!!p?.tmElemental||yes(p?.tmAoe);
 const clean=p=>({...p,tmElemental:null,tmAoe:false});
 const perGem=(power,price)=>Number.isFinite(power)&&power>=0&&Number.isFinite(price)&&price>0?power/price:null;
 function capture(catalog,at){
  const items={};
  for(const id of [Z_FRAGMENT,AOE_FRAGMENT]){const row=catalog?.[id],prices={};for(const [c,key]of [['gold','minGold'],['orb','minOrb']]){const n=Number(row?.[key]);if(Number.isFinite(n)&&n>0&&n<=Number.MAX_SAFE_INTEGER/FRAGMENTS_PER_DISC)prices[c]=n;}if(Object.keys(prices).length)items[id]=prices;}
  return {at:Number.isFinite(at)?at:0,items};
 }
 function breakdown(p,currency,snapshot,offerPrice=null,now=Date.now()){
  if(!has(p))return null;
  const parts=[],type=String(p.tmElemental||'').toUpperCase();
  if(p.tmElemental)parts.push({id:DISCS[type]?Z_FRAGMENT:null,label:'Z-Move '+(DISCS[type]?type:'(tipo não identificado)')});
  if(yes(p.tmAoe))parts.push({id:AOE_FRAGMENT,label:'AoE'});
  const fresh=Number.isFinite(snapshot?.at)&&snapshot.at>0&&now>=snapshot.at&&now-snapshot.at<=MAX_AGE;
  for(const part of parts){const price=snapshot?.items?.[part.id]?.[currency];part.quantity=FRAGMENTS_PER_DISC;part.unitPrice=fresh&&Number.isFinite(price)&&price>0&&price<=Number.MAX_SAFE_INTEGER/FRAGMENTS_PER_DISC?price:null;part.price=part.unitPrice!=null?part.unitPrice*part.quantity:null;}
  const complete=parts.every(p=>p.price!=null),discs=complete?parts.reduce((s,p)=>s+p.price,0):null;
  return {parts,discs,effectivePrice:complete&&Number.isFinite(offerPrice)?offerPrice-discs:null,at:snapshot?.at||0,fresh,complete};
 }
 const api={DISCS,Z_FRAGMENT,AOE_FRAGMENT,FRAGMENTS_PER_DISC,MAX_AGE,has,clean,capture,breakdown,perGem};
 if(typeof module==='object'&&module.exports)module.exports=api;else root.PokeIdleMarketBonuses=api;
})(typeof window==='object'?window:globalThis);
