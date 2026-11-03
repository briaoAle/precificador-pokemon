// Página do Precificador: lê precos.json, a ficha colada e os Adicionais marcados, e mostra o preço.
// Todo texto da ficha entra na página só por textContent.
(function(){
 'use strict';
 const P=window.PokeIdlePvePricing,$=id=>document.getElementById(id);
 const SPRITES='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';
 const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;};
 const gems=n=>Math.round(n).toLocaleString('pt-BR');
 const when=at=>new Date(at).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
 let central=null,rows=null,precos=null;

 // Sprite da PokeAPI; se falhar, um marcador "?" fica no lugar e um clique tenta de novo.
 function sprite(speciesId,shiny,small){
  const id=central.spriteId(speciesId),img=el('img','sprite'+(small?' small':''));img.alt='';img.loading='lazy';
  const missing=()=>{const mark=el('button','nosprite'+(small?' small':''),'?');mark.type='button';mark.title='Imagem indisponível · clique para tentar de novo';mark.setAttribute('aria-label',mark.title);
   mark.onclick=()=>{if(id){img.src=`${SPRITES}${shiny?'shiny/':''}${id}.png?${Date.now()}`;mark.replaceWith(img);}};img.replaceWith(mark);};
  img.onerror=missing;
  if(id)img.src=`${SPRITES}${shiny?'shiny/':''}${id}.png`;else queueMicrotask(missing);
  return img;
 }
 function types(list){const box=el('div','types');for(const t of list||[]){const type=String(t).toUpperCase();box.append(el('span','type type-'+type.replace(/[^A-Z]/g,''),type));}return box;}
 // Etiquetas do que entrou no preço (shiny e Adicionais marcados), para não esquecer de conferir ao trocar de Pokémon.
 function tags(r){
  const box=el('div','tags');if(r.shiny)box.append(el('span','addon shiny','Shiny'));
  for(const p of r.parts)box.append(el('span','addon',p.label));
  if(!r.parts.length)box.append(el('span','addon none','Sem Adicionais'));
  return box;
 }
 // No celular o resultado fica abaixo do formulário: rola até ele se estiver fora da tela.
 function show(...nodes){const box=$('result');box.replaceChildren(el('h2',null,'Preço'),...nodes);if(box.getBoundingClientRect().top>innerHeight*.6)box.scrollIntoView({block:'start'});}
 function error(text){show(el('p','error',text));}

 // Teste contra vendas passadas (precos.json → teste) em dois gráficos: onde o preço pago caiu em relação à faixa e
 // quanto ele costuma se afastar do Preço justo, já em Gemas para o Pokémon precificado.
 function confidence(t,r){
  const details=el('details');details.open=true;details.append(el('summary',null,'Quão confiável é este preço?'));
  details.append(el('p',null,'É uma estimativa. O mercado é feito por jogadores, e Pokémon parecidos às vezes são vendidos por preços bem diferentes.'));
  if(!t?.precificadas)return details;
  const pct=x=>Math.round(x*100),times=t.erroMediano.toLocaleString('pt-BR',{maximumFractionDigits:1});
  details.append(el('p',null,`Testamos o cálculo em ${gems(t.vendas)} vendas reais, cada uma comparada só com as vendas que vieram antes dela.`));
  const bands=[['out',t.abaixo,'abaixo de Vender rápido'],['in',t.dentroDaFaixa,'entre Vender rápido e Esperar'],['out',t.acima,'acima de Esperar']];
  const stack=el('div','stack');stack.setAttribute('role','img');stack.setAttribute('aria-label','Onde o preço pago caiu: '+bands.map(([,x,label])=>`${pct(x)}% ${label}`).join(', '));
  const legend=el('ul','legend');
  for(const [cls,x,label]of bands){const seg=el('div','seg '+cls);seg.style.flexGrow=String(x);seg.title=`${pct(x)}% das vendas ${label}`;stack.append(seg);
   const li=el('li');li.append(el('i','swatch '+cls),el('b',null,pct(x)+'%'),' '+label);legend.append(li);}
  details.append(el('h5',null,'Onde o preço pago caiu'),stack,legend);
  // Metade das vendas ficou a até "erroMediano" vezes do Preço justo: a faixa em escala de razão, com o justo no meio.
  const lo=r.median/t.erroMediano,hi=r.median*t.erroMediano,range=el('div','range');range.setAttribute('role','img');
  range.setAttribute('aria-label',`Metade das vendas saiu entre ${gems(lo)} e ${gems(hi)} Gemas; Preço justo ${gems(r.median)}`);
  const track=el('div','track'),band=el('div','band'),dot=el('div','dot');band.title=`Metade das vendas: de ${gems(lo)} a ${gems(hi)} Gemas`;dot.title=`Preço justo: ${gems(r.median)} Gemas`;track.append(band,dot);
  const marks=el('div','marks');marks.append(el('span','m25',gems(lo)),el('span','m50',gems(r.median)),el('span','m75',gems(hi)));range.append(track,marks);
  details.append(el('h5',null,'Quanto o preço pago se afasta do Preço justo'),range,
   el('p','small',`Metade das vendas saiu entre ${gems(lo)} e ${gems(hi)} Gemas: de 1/${times} até ${times} vezes o Preço justo. A outra metade saiu ainda mais longe.`));
  const list=el('ul');
  list.append(el('li',null,t.ate25>0?`Só 1 em cada ${Math.round(1/t.ate25)} vendas saiu perto do Preço justo (até 25% de diferença).`:'Nenhuma venda saiu perto do Preço justo (até 25% de diferença).'));
  list.append(el('li',null,t.vies>=0?`Em geral as vendas saíram por menos: o Preço justo ficou ${pct(t.vies)}% acima do valor pago.`:`Em geral as vendas saíram por mais: o Preço justo ficou ${pct(-t.vies)}% abaixo do valor pago.`));
  details.append(list,el('p',null,'Use a faixa como referência e compare com as vendas recentes listadas abaixo.'));
  return details;
 }

 // Tabela ordenada só pelo cabeçalho: 1º clique números do maior para o menor e nomes de A a Z, 2º clique inverte.
 function salesTable(comps){
  const cols=[{key:'name',label:'Pokémon',text:true},{key:'level',label:'Nível'},{key:'at',label:'Data'},{key:'price',label:'Gemas'}];
  let sort={key:'at',dir:'desc'};
  const table=el('table'),head=el('tr'),body=el('tbody');table.append(el('thead'),body);table.tHead.append(head);
  function draw(){
   head.replaceChildren(...cols.map(c=>{const th=el('th');th.scope='col';const b=el('button',null,c.label+(sort.key===c.key?(sort.dir==='asc'?' ↑':' ↓'):''));b.type='button';
    if(sort.key===c.key)th.setAttribute('aria-sort',sort.dir==='asc'?'ascending':'descending');
    b.onclick=()=>{sort=sort.key===c.key?{key:c.key,dir:sort.dir==='asc'?'desc':'asc'}:{key:c.key,dir:c.text?'asc':'desc'};draw();};th.append(b);return th;}));
   const sign=sort.dir==='asc'?1:-1,text=cols.find(c=>c.key===sort.key).text;
   const list=[...comps].sort((a,b)=>(text?String(a[sort.key]).localeCompare(String(b[sort.key]),'pt-BR'):a[sort.key]-b[sort.key])*sign||b.at-a.at);
   body.replaceChildren(...list.map(c=>{
    const tr=el('tr'),who=el('td'),mon=el('div','mon'),name=el('div');
    name.append(el('div',null,`${c.name}${c.shiny?' shiny':''}`),types(c.types));
    if(c.uncertain){const tag=el('div','tag warn','Adicional incerto');tag.title='O AoE ou Z-Move desta venda pode ter sido aplicado depois dela';name.append(tag);}
    mon.append(sprite(c.speciesId,c.shiny,true),name);who.append(mon);
    tr.append(who,el('td',null,gems(c.level)),el('td',null,when(c.at)),el('td',null,gems(c.price)));return tr;}));
  }
  draw();const wrap=el('div','tablewrap');wrap.append(table);return wrap;
 }

 function render(r){
  const nodes=[],who=el('div','who'),title=el('div');
  title.append(el('h3',null,`${r.name}${r.shiny?' shiny':''} · Nv ${gems(r.level)}`),types(r.types),tags(r));who.append(sprite(r.speciesId,r.shiny,false),title);nodes.push(who);
  if(!r.available)nodes.push(el('p','error','Poucas vendas para comparar este Pokémon.'));
  else{
   const prices=el('div','prices');
   for(const [key,label]of [['low','Vender rápido'],['median','Preço justo'],['high','Esperar']]){const box=el('div','price'+(key==='median'?' main':''));box.append(el('span',null,label),el('b',null,gems(r[key])));prices.append(box);}
   const parts=el('ul','parts'),row=(label,value,cls)=>{const li=el('li',cls);li.append(el('span',null,label),el('b',null,value));parts.append(li);};
   row('Pokémon',gems(r.base)+' Gemas');
   for(const p of r.parts)row(`${p.label} (${p.quantity} × ${p.unit!=null?gems(p.unit):'?'})`,p.total!=null?gems(p.total)+' Gemas':'sem cotação','sub');
   const family=Math.round(r.weight*100);
   nodes.push(el('p','muted small','Preços em Gemas.'),prices,parts);
   if(r.parts.length)nodes.push(el('p','note small muted','Adicionais: 10 unidades do item pelo preço mais recente, que é a mediana das leituras do menor preço anunciado no mercado naquele dia. Nas vendas usadas na comparação, os Adicionais foram descontados pelo preço do item no dia de cada venda.'));
   nodes.push(el('p','note small',family?`${family}% vendas de ${r.family} (${r.familyCount}) · ${100-family}% mercado (${r.marketCount})`:`Mercado: ${r.marketCount} vendas${r.familyCount?'':` · nenhuma venda de ${r.family}`}`));
   // O histórico do jogo mostra o AoE e o Z-Move que o Pokémon tem hoje, mesmo aplicados depois da venda.
   const u=r.uncertain||{};
   if(u.family>0)nodes.push(el('p','note small warn',`${u.family} de ${r.familyCount} vendas de ${r.family} têm AoE ou Z-Move que pode ter sido aplicado depois da venda: preço menos confiável.`));
   else if(u.market>0&&u.market>=.05*r.marketCount)nodes.push(el('p','note small warn',`${Math.round(u.market/r.marketCount*100)}% das vendas do mercado têm AoE ou Z-Move que pode ter sido aplicado depois da venda.`));
  }
  if(r.missing?.length)nodes.push(el('p','note small warn',`Sem cotação de ${r.missing.join(', ')}: fora do total.`));
  if(r.refined)nodes.push(el('p','note small','O refino não entra no preço.'));
  nodes.push(el('p','note small muted',`Vendas lidas em ${when(Date.parse(precos.geradoEm))}`));
  if(r.available)nodes.push(confidence(precos.teste,r));
  if(r.comps?.length)nodes.push(el('h4',null,`Vendas recentes de ${r.family}`),salesTable(r.comps));
  show(...nodes);
 }

 // O mesmo Pokémon: espécie, nível, potência, qualidade, shiny e IVs. Colar outro desmarca Z-Move e AoE.
 // Mega não tem caixa: vem da espécie da ficha ("Mega Starmie").
 const ADDONS=['zmove','aoe'];let pricedKey=null;
 const keyOf=s=>s.nome?JSON.stringify([s.nome,s.level,s.potencia,s.quality,s.shiny,s.ivs]):null;
 function pasted(){
  const key=keyOf(PokeIdleFicha.parse($('ficha').value));
  if(!key||!pricedKey||key===pricedKey||!ADDONS.some(id=>$(id).checked))return;
  for(const id of ADDONS)$(id).checked=false;$('reset').hidden=false;
 }
 function price(event){
  event.preventDefault();
  const text=$('ficha').value;if(!text.trim())return error('Cole o texto do botão "Copiar p/ ChatGPT" da ficha.');
  const sheet=PokeIdleFicha.parse(text);
  if(!sheet.nome)return error('Não encontrei a espécie no texto. Use o botão "Copiar p/ ChatGPT" da ficha e cole o texto inteiro.');
  pricedKey=keyOf(sheet);$('reset').hidden=true;
  // O tipo do Z-Move não muda o preço (o fragmento é o mesmo): vai um tipo qualquer e a linha mostra só "Z-Move".
  try{const r=P.priceSheet(central,{...sheet,tmElemental:$('zmove').checked?'NORMAL':null,tmAoe:$('aoe').checked},{rows,itemPrices:precos.itens,now:Date.parse(precos.geradoEm)});
   render({...r,parts:r.parts.map(p=>/^Z-Move/.test(p.label)?{...p,label:'Z-Move'}:p),missing:(r.missing||[]).map(l=>/^Z-Move/.test(l)?'Z-Move':l)});}
  catch(e){error(e.message);}
 }
 async function start(){
  $('form').addEventListener('submit',price);$('ficha').addEventListener('input',pasted);
  for(const id of ADDONS)$(id).addEventListener('change',()=>{$('reset').hidden=true;});
  try{
   const response=await fetch('precos.json',{cache:'no-cache'});if(!response.ok)throw Error(response.status);
   precos=await response.json();rows=PokeIdleCentral.linhas(precos);central=PokeIdleCentral.create(window);
   $('status').textContent=`Vendas lidas em ${when(Date.parse(precos.geradoEm))} · ${gems(precos.vendas.length)} vendas dos últimos ${precos.janelaDias} dias.`;
   $('go').disabled=false;
  }catch(e){$('status').textContent='Não foi possível carregar as vendas. Recarregue a página.';$('status').classList.add('warn');}
 }
 start();
})();
