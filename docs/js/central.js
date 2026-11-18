// Catálogo no navegador: espécies, últimas evoluções e o PvE da última evolução no Nv 100, que o motor do preço usa.
(function(root){
 'use strict';
 function create(c){
  const species=new Map(c.PI_ESPECIES.map(e=>[e.id,e])),megas=new Map(),cache=new Map();
  let notas=null;const gradeOf=(id,p)=>{if(!c.PokeIdleNota)return null;notas??=c.PokeIdleNota.create(species);const v=notas.nota(id,p);return Number.isFinite(v)?v:null;};
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
   // Nota da última evolução (grade), como no motor: o preço da Mega usa a Nota da forma base.
   if(options[0])options[0].grade=gradeOf(options[0].id,p);
   const result={speciesId:e?.id||Number(p.speciesId),types:e?.t||[],name:e?.n||p.nome||'Pokémon',final:options[0]||null,alternatives:options};
   if(cache.size>=2000)cache.delete(cache.keys().next().value);cache.set(signature,result);return result;
  }
  // As sprites públicas vão até o dex 1025; Megas e formas regionais usam a da espécie base.
  function spriteId(id){const e=species.get(Number(id));if(Number.isInteger(e?.spriteId))return e.spriteId;id=Number(id);return id<=1025?id:id>=13000?id%1000:id>=3000&&id<4000?id-3000:null;}
  return {species,megas,finals,evaluate,spriteId};
 }
 // Vendas em colunas (formato 2): cada campo é uma lista, na ordem das vendas. Sem isso o nome de cada campo se repetia em
 // todas as vendas e o arquivo passava de 12 MB. Tipos: "t" = horário em minutos desde a venda anterior (a primeira, desde
 // 1970), "s" = índice em nomes, "b" = 1/0 para sim/não; sem tipo = número. null continua null em qualquer tipo.
 function compactar(lista){
  const ordem=lista.length?Object.keys(lista[0]):[],nomes=[],indice=new Map(),campos={},tipos={};
  for(const v of lista)if(Object.keys(v).join()!==ordem.join())throw Error('vendas com campos diferentes');
  for(const k of ordem){
   const valores=lista.map(v=>v[k]),tipo=k==='at'?'t':valores.some(x=>typeof x==='string')?'s':valores.some(x=>typeof x==='boolean')?'b':null;
   if(tipo)tipos[k]=tipo;let anterior=0;
   campos[k]=valores.map(x=>{
    if(x===null)return null;
    if(tipo==='t'){if(!Number.isInteger(x)||x%60000)throw Error('horário fora do minuto cheio');const m=x/60000,d=m-anterior;anterior=m;return d;}
    if(tipo==='s'){if(typeof x!=='string')throw Error(`${k}: texto misturado com outro tipo`);if(!indice.has(x)){indice.set(x,nomes.length);nomes.push(x);}return indice.get(x);}
    if(tipo==='b'){if(typeof x!=='boolean')throw Error(`${k}: sim/não misturado com outro tipo`);return x?1:0;}
    if(typeof x!=='number'||!Number.isFinite(x))throw Error(`${k}: valor que não é número`);return x;
   });
  }
  return {formato:2,n:lista.length,nomes,tipos,campos};
 }
 // Vendas de precos.json como lista de objetos, no formato 2 ou no antigo (lista).
 function vendas(precos){
  const v=precos?.vendas;if(Array.isArray(v))return v;
  if(v?.formato!==2||!Number.isInteger(v.n)||!v.campos)throw Error('formato das vendas desconhecido');
  const lista=Array.from({length:v.n},()=>({}));
  for(const k of Object.keys(v.campos)){
   const col=v.campos[k],tipo=v.tipos?.[k];if(!Array.isArray(col)||col.length!==v.n)throw Error(`coluna ${k} com tamanho errado`);let m=0;
   for(let i=0;i<v.n;i++){const x=col[i];lista[i][k]=x===null?null:tipo==='t'?(m+=x)*60000:tipo==='s'?v.nomes[x]:tipo==='b'?x===1:x;}
  }
  return lista;
 }
 // Vendas de precos.json → linhas do motor (o motor guarda também o log do preço base).
 const linhas=precos=>vendas(precos).map(v=>({...v,logBase:Math.log(v.base)}));
 root.PokeIdleCentral={create,linhas,vendas,compactar};
})(typeof window==='object'?window:globalThis);
