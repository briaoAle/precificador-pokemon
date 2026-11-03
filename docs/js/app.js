// Página do Precificador: lê precos.json, a ficha colada e os Adicionais marcados, e mostra o preço.
// Todo texto da ficha entra na página só por textContent.
(function(){
 'use strict';
 const P=window.PokeIdlePvePricing,B=window.PokeIdleMarketBonuses,$=id=>document.getElementById(id);
 const SPRITES='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';
 const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;};
 const gems=n=>Math.round(n).toLocaleString('pt-BR');
 const when=at=>new Date(at).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
 const norm=s=>String(s??'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim();
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
 function types(list){const box=el('div','types');for(const t of list||[])box.append(el('span',null,String(t).toUpperCase()));return box;}
 // No celular o resultado fica abaixo do formulário: rola até ele se estiver fora da tela.
 function show(...nodes){const box=$('result');box.replaceChildren(el('h2',null,'Preço'),...nodes);if(box.getBoundingClientRect().top>innerHeight*.6)box.scrollIntoView({block:'start'});}
 function error(text){show(el('p','error',text));}

 // Números do teste contra vendas passadas (precos.json → teste), arredondados para o texto ficar natural.
 function confidence(t){
  const details=el('details');details.open=true;details.append(el('summary',null,'Quão confiável é este preço?'));
  details.append(el('p',null,'O mercado do jogo é feito por pessoas e não segue uma regra fixa: dois Pokémon quase iguais podem ser vendidos por preços muito diferentes. Este preço serve para orientar, não para garantir.'));
  if(!t?.precificadas)return details;
  const share=x=>Math.abs(x-.5)<.06?'metade':`${Math.round(x*100)}%`,oneIn=x=>x>0?`1 em cada ${Math.round(1/x)}`:'nenhuma';
  const p=el('p');p.append('Para medir isso, precificamos com este método ',el('b',null,`${gems(t.vendas)} vendas reais`),', usando só o que se sabia antes de cada venda, e comparamos com o preço pago:');
  const list=el('ul'),item=(...parts)=>{const li=el('li');li.append(...parts);list.append(li);};
  item(el('b',null,`Cerca de ${share(t.dentroDaFaixa)} das vendas ficou entre "Vender rápido" e "Esperar".`),` Cerca de ${oneIn(t.abaixo).replace(' cada','')} saiu abaixo de "Vender rápido" e cerca de ${oneIn(t.acima).replace(' cada','')} acima de "Esperar".`);
  item('Em metade das vendas, o preço pago ficou a até ',el('b',null,`${t.erroMediano.toLocaleString('pt-BR',{maximumFractionDigits:1})} vezes`),' do "Preço justo", para mais ou para menos.');
  item('Só ',el('b',null,oneIn(t.ate25)),' vendas ficou a menos de 25% do "Preço justo".');
  item('Em média, o "Preço justo" saiu ',el('b',null,`${Math.round(Math.abs(t.vies)*100)}% ${t.vies>=0?'acima':'abaixo'}`),' do que foi pago.');
  details.append(p,list,el('p',null,'Use a faixa como referência e compare com as vendas recentes da mesma família, listadas abaixo do preço.'));
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
    name.append(el('div',null,`${c.name}${c.shiny?' shiny':''}`),types(c.types));mon.append(sprite(c.speciesId,c.shiny,true),name);who.append(mon);
    tr.append(who,el('td',null,gems(c.level)),el('td',null,when(c.at)),el('td',null,gems(c.price)));return tr;}));
  }
  draw();const wrap=el('div','tablewrap');wrap.append(table);return wrap;
 }

 function render(r){
  const nodes=[],who=el('div','who'),title=el('div');
  title.append(el('h3',null,`${r.name}${r.shiny?' shiny':''} · Nv ${gems(r.level)}`),types(r.types));who.append(sprite(r.speciesId,r.shiny,false),title);nodes.push(who);
  if(!r.available)nodes.push(el('p','error','Poucas vendas para comparar este Pokémon.'));
  else{
   const prices=el('div','prices');
   for(const [key,label]of [['low','Vender rápido'],['median','Preço justo'],['high','Esperar']]){const box=el('div','price'+(key==='median'?' main':''));box.append(el('span',null,label),el('b',null,gems(r[key])));prices.append(box);}
   const parts=el('ul','parts'),row=(label,value,cls)=>{const li=el('li',cls);li.append(el('span',null,label),el('b',null,value));parts.append(li);};
   row('Pokémon',gems(r.base)+' Gemas');
   for(const p of r.parts)row(`${p.label} (${p.quantity} × ${p.unit!=null?gems(p.unit):'?'})`,p.total!=null?gems(p.total)+' Gemas':'sem cotação','sub');
   const family=Math.round(r.weight*100);
   nodes.push(el('p','muted small','Preços em Gemas.'),prices,parts,el('p','note small',family?`${family}% vendas de ${r.family} (${r.familyCount}) · ${100-family}% mercado (${r.marketCount})`:`Mercado: ${r.marketCount} vendas${r.familyCount?'':` · nenhuma venda de ${r.family}`}`));
  }
  if(r.missing?.length)nodes.push(el('p','note small warn',`Sem cotação de ${r.missing.join(', ')}: fora do total.`));
  if(r.refined)nodes.push(el('p','note small','O refino não entra no preço.'));
  nodes.push(el('p','note small muted',`Vendas lidas em ${when(Date.parse(precos.geradoEm))}`));
  if(r.available)nodes.push(confidence(precos.teste));
  if(r.comps?.length)nodes.push(el('h4',null,`Vendas recentes de ${r.family}`),salesTable(r.comps));
  show(...nodes);
 }

 // "Mega" marcado numa ficha que não é de Mega: a primeira forma Mega da espécie (todas valem o mesmo no preço:
 // o PvE é o da espécie base e a pedra é a mesma).
 function megaName(nome){
  const n=norm(nome),e=[...central.species.values()].find(e=>norm(e.n)===n);if(!e)return nome;
  if(central.megas.has(e.id))return central.species.get(central.megas.get(e.id)[0]).n;
  return nome;
 }
 function price(event){
  event.preventDefault();
  const text=$('ficha').value;if(!text.trim())return error('Cole o texto do botão "Copiar p/ ChatGPT" da ficha.');
  const sheet=PokeIdleFicha.parse(text);
  if(!sheet.nome)return error('Não encontrei a espécie no texto. Use o botão "Copiar p/ ChatGPT" da ficha e cole o texto inteiro.');
  if($('mega').checked)sheet.nome=megaName(sheet.nome);
  try{render(P.priceSheet(central,{...sheet,tmElemental:$('zmove').value||null,tmAoe:$('aoe').checked},{rows,itemPrices:precos.itens,now:Date.parse(precos.geradoEm)}));}
  catch(e){error(e.message);}
 }
 async function start(){
  for(const type of Object.keys(B.DISCS)){const o=el('option',null,type);o.value=type;$('zmove').append(o);}
  $('form').addEventListener('submit',price);
  try{
   const response=await fetch('precos.json',{cache:'no-cache'});if(!response.ok)throw Error(response.status);
   precos=await response.json();rows=PokeIdleCentral.linhas(precos);central=PokeIdleCentral.create(window);
   $('status').textContent=`Vendas lidas em ${when(Date.parse(precos.geradoEm))} · ${gems(precos.vendas.length)} vendas dos últimos ${precos.janelaDias} dias.`;
   $('go').disabled=false;
  }catch(e){$('status').textContent='Não foi possível carregar as vendas. Recarregue a página.';$('status').classList.add('warn');}
 }
 start();
})();
