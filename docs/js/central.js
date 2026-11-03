// Catálogo no navegador: espécies, últimas evoluções e o PvE da última evolução no Nv 100, que o motor do preço usa.
(function(root){
 'use strict';
 function create(c){
  const species=new Map(c.PI_ESPECIES.map(e=>[e.id,e])),megas=new Map(),cache=new Map();
  for(const [id,e]of species){const base=e.megaBase??(id>=3000&&id<4000&&/^Mega /i.test(e.n)?id-3000:null);if(species.has(base)){if(!megas.has(base))megas.set(base,[]);megas.get(base).push(id);}}
  function finals(id,includeMegas){
   const result=[],seen=new Set();
   const visit=id=>{if(seen.has(id))return;seen.add(id);const children=(species.get(id)?.evo||[]).filter(id=>species.has(id));if(!children.length&&species.has(id))result.push(species.get(id));else children.forEach(visit);};visit(id);
   const forms=[...result];if(includeMegas)for(const e of result)for(const id of megas.get(e.id)||[])forms.push(species.get(id));
   return forms;
  }
  // Maior PvE primeiro; duas evoluções com o mesmo PvE seguem a ordem de desempate do catálogo, depois o número.
  function evaluate(p,includeMegas){
   const signature=JSON.stringify([p,includeMegas]);if(cache.has(signature))return cache.get(signature);
   const e=species.get(Number(p.speciesId)),birth={...p,level:100,refino:{}},options=[];
   if(e)for(const form of finals(e.id,includeMegas)){
    const power=c.PokeIdlePvePower.calcular(birth,form);if(!power)continue;
    options.push({id:form.id,name:form.n,types:form.t||[],pve:form.m?.length?power.power:null,tie:form.desempate??0});
   }
   options.sort((a,b)=>b.pve-a.pve||a.tie-b.tie||a.id-b.id);
   const result={speciesId:e?.id||Number(p.speciesId),types:e?.t||[],name:e?.n||p.nome||'Pokémon',final:options[0]||null,alternatives:options};
   if(cache.size>=2000)cache.delete(cache.keys().next().value);cache.set(signature,result);return result;
  }
  // As sprites públicas vão até o dex 1025; Megas e formas regionais usam a da espécie base.
  function spriteId(id){const e=species.get(Number(id));if(Number.isInteger(e?.spriteId))return e.spriteId;id=Number(id);return id<=1025?id:id>=13000?id%1000:id>=3000&&id<4000?id-3000:null;}
  return {species,megas,finals,evaluate,spriteId};
 }
 // Vendas de precos.json → linhas do motor (o motor guarda também o log do preço base).
 const linhas=precos=>precos.vendas.map(v=>({...v,logBase:Math.log(v.base)}));
 root.PokeIdleCentral={create,linhas};
})(typeof window==='object'?window:globalThis);
