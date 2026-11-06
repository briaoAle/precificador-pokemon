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
 function show(nodes,below=[]){const box=$('result'),wide=$('charts');box.replaceChildren(el('h2',null,'Preço em Gemas'),...nodes);
  wide.replaceChildren(...below);wide.hidden=!below.length;
  if(box.getBoundingClientRect().top>innerHeight*.6)box.scrollIntoView({block:'start'});}
 function error(text){show([el('p','error',text)]);}

 // Dispersão das vendas reais da cadeia evolutiva deste Pokémon (mesmo shiny, 30 dias): preço sem os Adicionais (escala log, no eixo vertical) ×
 // Poder (PvE, o que o cálculo compara: IV, qualidade e potência, no Nv 100, escala log) ou × Nota da Calculadora (0 a 10
 // dentro da espécie, escala linear), no eixo horizontal, escolhido no seletor. As linhas cruzam neste Pokémon: Preço justo e o valor dele.
 // Faixa verde = Vender rápido–Esperar. Nada projetado: só o que vendeu.
 // SEM filtro de nível (decisão de 03/11/2026): entram vendas de todos os níveis da cadeia evolutiva; o eixo é o PvE ou a nota.
 const SVG='http://www.w3.org/2000/svg',MIN_GEMS=2,MAX_LEVEL=10000;
 const svg=(tag,attrs,text)=>{const e=document.createElementNS(SVG,tag);for(const k in attrs)e.setAttribute(k,attrs[k]);if(text!=null)e.textContent=text;return e;};
 const METRICS={
  nota:{button:'Por nota',axis:'Nota (0 a 10)',mine:'a Nota deste Pokémon',near:'Nota parecida',of:x=>x.nota,from:3.5,fmt:v=>v.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:2}),up:'nota maior',down:'nota menor',more:'com nota maior',less:'com nota menor'},
  pve:{button:'Por PvE',axis:'PvE',mine:'o PvE deste Pokémon',near:'PvE parecido',of:x=>x.pve,from:0,fmt:v=>gems(v),up:'mais forte',down:'mais fraco',more:'mais fortes',less:'mais fracas'}};
 // Gráfico abre em "Por nota" (04/11/2026); sem Nota na ficha, em "Por poder".
 let chartMode='nota',grouped=false;
 function scatter(r,all,m,lo,hi,grouped){
  const mine=m.of(r),known=all.filter(x=>Number.isFinite(m.of(x))),sales=known.filter(x=>m.of(x)>=m.from),hidden=known.length-sales.length;
  if(sales.length<3)return [el('p','small muted',`Poucas vendas ${chainOf(r).of}${r.shiny?' shiny':''} com ${m.axis.toLowerCase()} para mostrar num gráfico.`)];
  // Eixos (invertidos em 05/11/2026): o eixo vertical fica colado à esquerda, em 0 (Poder) ou 3,5 (Nota): vendas com nota abaixo de
  // 3,5 ficam fora (contadas no texto); vai até a venda mais alta; o eixo horizontal passa no meio, no Preço justo
  // (preço em escala log, mesma distância dos dois lados). A linha amarela tracejada é a Nota ou o Poder deste Pokémon (conforme o eixo), onde cair.
  const prices=sales.map(x=>x.base),lb=Math.log(r.base),devs=prices.map(v=>Math.abs(Math.log(v)-lb)).sort((a,b)=>a-b),dp=1.06*Math.max(.1,devs[Math.floor((devs.length-1)*.98)]||0,Math.abs(Math.log(lo)-lb),Math.abs(Math.log(hi)-lb));
  // O eixo do preço cobre 98% das vendas (centrado no Preço justo): as mais extremas ficam na borda, em círculo vazado.
  const outside=prices.filter(v=>Math.abs(Math.log(v)-lb)>dp).length;
  const vals=[...sales.map(m.of),mine],c0=Math.min(m.from,mine),top=Math.max(...vals),p0=Math.min(lb,Math.max(Math.log(MIN_GEMS),lb-dp)),p1=lb+dp,v0=c0,v1=top+(top-c0)*.06||c0+1;
  const W=340,H=222,L=78,R=334,T=10,B=176,X=v=>L+(v-v0)/(v1-v0)*(R-L),Y=v=>B-(Math.min(p1,Math.max(p0,Math.log(v)))-p0)/(p1-p0)*(B-T);
  const chart=svg('svg',{viewBox:`0 0 ${W} ${H}`,class:'scatter'+(sales.length>150?' dense':''),role:'img'}),cx=X(mine),cy=Y(r.base),ax=X(c0);
  const yh=Math.max(T,Y(hi)),yl=Math.min(B,Y(lo));
  chart.append(svg('rect',{class:'band',x:L,y:yh,width:R-L,height:Math.max(1,yl-yh)}),svg('rect',{class:'frame',x:L,y:T,width:R-L,height:B-T}));
  chart.append(svg('line',{class:'axisline',x1:ax,x2:ax,y1:T,y2:B}),svg('line',{class:'axisline',x1:L,x2:R,y1:cy,y2:cy}));
  // "Agrupar": grade de 24 × 14 quadrados; a cor fica mais forte com mais vendas no quadrado (raiz da contagem) e a
  // cor é verde quando o meio do quadrado está entre Vender rápido e Esperar. Cada quadrado resume as suas vendas.
  if(grouped){const CW=(R-L)/24,CH=(B-T)/14,cells=new Map();
   for(const s of sales){const i=Math.min(23,Math.max(0,Math.floor((X(m.of(s))-L)/CW))),j=Math.min(13,Math.max(0,Math.floor((B-Y(s.base))/CH))),k=i+':'+j;
    if(!cells.has(k))cells.set(k,{i,j,list:[]});cells.get(k).list.push(s);}
   const most=Math.max(...[...cells.values()].map(c=>c.list.length)),mid=a=>{const v=[...a].sort((x,y)=>x-y);return v[v.length>>1];};
   for(const c of cells.values()){const n=c.list.length,ps=c.list.map(s=>s.base),vs=c.list.map(m.of),price=Math.exp(p0+(c.j+.5)*CH/(B-T)*(p1-p0));
    const cell=svg('rect',{class:'cell'+(price>=lo&&price<=hi?' in':''),x:L+c.i*CW+.5,y:B-(c.j+1)*CH+.5,width:CW-1,height:CH-1,rx:1.5,'fill-opacity':(.2+.8*Math.sqrt(n/most)).toFixed(2)});
    cell.append(svg('title',{},`${n} ${n===1?'venda':'vendas'} · ${gems(Math.min(...ps))} a ${gems(Math.max(...ps))} Gemas (mediana ${gems(mid(ps))}) · ${m.axis} ${m.fmt(Math.min(...vs))} a ${m.fmt(Math.max(...vs))}`));chart.append(cell);}}
  else for(const s of [...sales].sort((a,b)=>a.at-b.at)){const dot=svg('circle',{class:'sale'+(s.base>=lo&&s.base<=hi?' in':'')+(Math.abs(Math.log(s.base)-lb)>dp?' over':''),cx:X(m.of(s)),cy:Y(s.base),r:4});
   dot.append(svg('title',{},`${s.name}: ${gems(s.base)} Gemas sem Adicionais · PvE ${gems(s.pve)}${Number.isFinite(s.nota)?' · nota '+METRICS.nota.fmt(s.nota):''} · Nv ${gems(s.level)} · ${when(s.at)}`));chart.append(dot);}
  // Por cima dos pontos: tracejado amarelo = o valor deste Pokémon; o ponto amarelo fica no Preço justo dele.
  chart.append(svg('line',{class:'mine',x1:cx,x2:cx,y1:T,y2:B}));
  const me=svg('circle',{class:'me',cx,cy,r:6});me.append(svg('title',{},`Este Pokémon: ${m.axis} ${m.fmt(mine)} · Preço justo ${gems(r.base)} Gemas`));chart.append(me);
  // Rótulos: preço à esquerda (Preço justo em duas linhas, no meio); embaixo, as pontas do eixo somem se encostarem no valor amarelo.
  const under=B+14,mid=(T+B)/2,tw=t=>t.length*6,mineText=m.fmt(mine),lowText=m.fmt(v0),highText=m.fmt(v1);
  chart.append(svg('text',{class:'axis',x:L-4,y:T+8,'text-anchor':'end'},gems(Math.exp(p1))),svg('text',{class:'axis',x:L-4,y:B,'text-anchor':'end'},gems(Math.exp(p0))),
   svg('text',{class:'fairlabel',x:L-4,y:cy-2,'text-anchor':'end'},'Preço justo'),svg('text',{class:'fairlabel',x:L-4,y:cy+10,'text-anchor':'end'},gems(r.base)),
   svg('text',{class:'minelabel',x:Math.min(W-tw(mineText)/2,cx),y:under,'text-anchor':'middle'},mineText),
   svg('text',{class:'axisname',x:(L+R)/2,y:H-4,'text-anchor':'middle'},m.axis+' →'),
   svg('text',{class:'axisname',x:12,y:mid,'text-anchor':'middle',transform:`rotate(-90 12 ${mid})`},'Preço (Gemas, sem Adicionais) →'));
  if(cx-L>=tw(lowText)+tw(mineText)/2+6)chart.append(svg('text',{class:'axis',x:L,y:under},lowText));
  if(R-cx>=tw(highText)+tw(mineText)/2+6)chart.append(svg('text',{class:'axis',x:R,y:under,'text-anchor':'end'},highText));
  const above=sales.filter(s=>m.of(s)>mine),cheapAbove=above.filter(s=>s.base<r.base).length,below=sales.filter(s=>m.of(s)<mine),dearBelow=below.filter(s=>s.base>r.base).length;
  const inside=prices.filter(v=>v>=lo&&v<=hi).length;
  chart.setAttribute('aria-label',`${sales.length} vendas ${chainOf(r).of}${r.shiny?' shiny':''} por preço e ${m.axis}; ${above.length} ${m.more} que este, ${cheapAbove} delas mais baratas que o Preço justo`);
  return [chart,el('p','small',`${grouped?'Cada quadrado junta vendas da cadeia, de qualquer nível; cor mais forte, mais vendas.':'Cada ponto é uma venda da cadeia, de qualquer nível.'} Linha branca: Preço justo. Amarelo: este Pokémon. Faixa verde: entre Vender rápido e Esperar (${inside} de ${sales.length} vendas). Preços sem Adicionais.${m===METRICS.nota&&chainOf(r).forms.length>1?' Cada venda mostra a Nota da forma vendida.':''}${outside?` Círculo vazado: ${outside===1?'venda muito longe':'vendas muito longe'} do Preço justo.`:''}${hidden?` ${hidden===1?'1 venda com nota abaixo de 3,5 fica fora':`${hidden} vendas com nota abaixo de 3,5 ficam fora`}.`:''}`)];
 }
 function familyChart(r){
  const all=rows.filter(x=>x.family===r.familyId&&x.shiny===r.shiny);
  if(all.length<3)return null;
  const addons=r.median-r.base,lo=Math.max(MIN_GEMS,r.low-addons),hi=Math.max(lo,r.high-addons);
  const box=el('div'),bar=el('div','switch');bar.setAttribute('role','group');bar.setAttribute('aria-label','Eixo horizontal do gráfico');
  const buttons={},group=el('button','toggle','Agrupar');group.type='button';group.title='Juntar as vendas em quadrados: a cor mostra quantas há em cada um';
  group.addEventListener('click',()=>{grouped=!grouped;draw(chartMode);});
  const draw=mode=>{chartMode=mode;for(const [k,b]of Object.entries(buttons))b.setAttribute('aria-pressed',String(k===mode));group.setAttribute("aria-pressed",String(grouped));box.replaceChildren(...scatter(r,all,METRICS[mode],lo,hi,grouped));};
  for(const [k,m]of Object.entries(METRICS)){const b=el('button',null,m.button);b.type='button';
   if(k==='nota'&&!Number.isFinite(r.nota)){b.disabled=true;b.title='A ficha colada não tem a Nota da Calculadora';}
   b.addEventListener('click',()=>draw(k));buttons[k]=b;bar.append(b);}
  // Eixo e agrupamento são escolhas diferentes: um separador vertical entre eles (04/11/2026).
  const tools=el("div","charttools");tools.append(bar,el('span','tooldiv'),group);
  draw(chartMode==='nota'&&!Number.isFinite(r.nota)?'pve':chartMode);
  const noNota=Number.isFinite(r.nota)?[]:[el('p','small muted','"Por nota" desligado: a ficha colada não tem a linha "Nota da Calculadora".')];
  // A barra (Por nota | Por poder | Agrupar) vai no cabeçalho do gráfico, ao lado do título (render).
  return [tools,box,...noNota];
 }
 // Teste contra vendas passadas (precos.json → teste): onde o preço pago caiu em relação à faixa, em todas as espécies.
 const pct=x=>Math.round(x*100);
 function generic(t,heading){
  const bands=[['out',t.abaixo,'abaixo de Vender rápido'],['in',t.dentroDaFaixa,'entre Vender rápido e Esperar'],['out',t.acima,'acima de Esperar']];
  const stack=el('div','stack');stack.setAttribute('role','img');stack.setAttribute('aria-label','Onde o preço pago caiu: '+bands.map(([,x,label])=>`${pct(x)}% ${label}`).join(', '));
  const legend=el('ul','legend');
  for(const [cls,x,label]of bands){const seg=el('div','seg '+cls);seg.style.flexGrow=String(x);seg.title=`${pct(x)}% das vendas ${label}`;stack.append(seg);
   const li=el('li');li.append(el('i','swatch '+cls),el('b',null,pct(x)+'%'),' '+label);legend.append(li);}
  return [el(heading,null,'Onde o preço pago caiu (teste com todas as espécies)'),stack,legend];
 }
 const REASONS={proximidade:'poucas vendas parecidas com este Pokémon',certeza:'muitas vendas com Adicional incerto',consistencia:'os preços das vendas parecidas variam muito',ampliacao:'poucas vendas deste Pokémon e da cadeia dele, completadas com outras espécies'};
 const PART_LABELS={proximidade:'Vendas parecidas (quantas existem)',certeza:'Adicionais confirmados (peso sem Adicional incerto)',consistencia:'Preços que concordam (o quanto as vendas concordam no preço)',ampliacao:'Peso da própria cadeia (quanto vem de vendas da cadeia)'};
// Nome curto da nota que mais pesa na calibração atual (precos.json → confianca.pesos; ordem: proximidade, certeza, consistência, ampliação).
 const topPart=()=>{const w=precos.confianca?.pesos||[],k=Object.keys(PART_LABELS),i=[1,2,3,4].reduce((a,b)=>(w[b]??0)>(w[a]??0)?b:a,1);return PART_LABELS[k[i-1]].replace(/ \(.*$/,'');};
 // Auditoria (fechada), em camadas para o jogador comum: um resumo de 4 linhas, "Como calculamos" e "Quão bem isso
 // funcionou" (os dois fechados). Os números vêm do resultado e de precos.json (teste e confianca).
 const listText=x=>x.length>1?`${x.slice(0,-1).join(', ')} e ${x.at(-1)}`:x[0];
 // A cadeia sempre leva o nome do Pokémon da ficha, mas reúne todas as formas: as vendas são agrupadas sob a última evolução.
 let parents=null;
 const depth=id=>{if(!parents){parents=new Map();for(const [i,e]of central.species)for(const k of e.evo||[])if(!parents.has(k))parents.set(k,i);}let d=0;while(parents.has(id)&&d<9){id=parents.get(id);d++;}return d;};
 const megaBaseOf=id=>{const e=central.species.get(id),b=e?.megaBase??(id>=3000&&id<4000&&/^Mega /i.test(e?.n||'')?id-3000:null);return central.species.has(b)?b:null;};
 function chainOf(r){
  const sold=rows.filter(x=>x.family===r.familyId&&x.shiny===r.shiny),e=central.species.get(r.speciesId),isMega=megaBaseOf(r.speciesId)!=null;
  depth(r.speciesId);
  const hasChain=isMega||central.megas.has(r.speciesId)||parents.has(r.speciesId)||(e?.evo||[]).some(id=>central.species.has(id));
  const byId=new Map();for(const x of sold)if(!byId.has(x.speciesId))byId.set(x.speciesId,x);
  const forms=[...byId.values()].sort((a,b)=>Number(a.mega)-Number(b.mega)||depth(a.speciesId)-depth(b.speciesId)||a.name.localeCompare(b.name)).map(x=>x.name);
  const kind=r.shiny?'shiny':'não shiny',of=hasChain?`da cadeia de ${r.name}`:`de ${r.name}`;
  const branch=!isMega&&central.finals(r.speciesId,false).length>1;
  const formsText=!hasChain?`Contam as vendas de ${r.name}.`:!forms.length?`A cadeia de ${r.name} não teve vendas ${kind} nos últimos 30 dias.`:`A cadeia de ${r.name} reúne vendas ${kind} de ${listText(forms)}.${sold.some(x=>x.mega)?' Nas vendas de Mega, o valor da pedra é descontado antes da comparação.':''}`;
  const power=isMega?`O PvE é calculado como ${r.family}, sem a Mega, no Nv 100. O valor da Mega é somado no fim, como um Adicional.`
   :branch?`O PvE é calculado como ${r.family}, a evolução mais forte para esta ficha, no Nv 100, e a cadeia fica só com as vendas ligadas a ${r.family}.`
   :r.name!==r.family?`O PvE é calculado como ${r.family}, a última evolução, no Nv 100.`:'O PvE é calculado no Nv 100.';
  const notaMix=forms.length>1?' A Nota de cada venda é a da forma vendida, e a mesma ficha pode ter Nota maior depois de evoluir.':'';
  return {hasChain,of,forms,formsText,powerText:`${power} A Nota e o nível são os da ficha.${notaMix}`,notaMix};
 }
 const li=text=>el('li',null,text);
 function confidence(t,r){
  const details=el('details');details.append(el('summary',null,'Como o preço e a confiança são calculados?'));
  const ch=chainOf(r),share=Math.round((r.weight||0)*100),c=r.confidence,u=r.uncertain||{},story=r.available?priceStory(r):null;
  const para=(lead,text)=>{const p=el('p');p.append(el('b',null,lead+' '),text);return p;};
  details.append(
   para(`Preço justo: ${gems(r.median)} Gemas.`,`É o valor do meio das vendas parecidas, ajustadas para a ficha deste Pokémon, com os Adicionais somados.${story?' '+story:''} Vender rápido e Esperar marcam a metade central dessas vendas.${t?.dentroDaFaixa?` No teste com vendas novas, ${pct(t.dentroDaFaixa)}% saíram dentro da faixa: o número é outro porque ali conta o que aconteceu depois, não as vendas usadas no cálculo.`:''}`),
   para('Quais vendas contam?',`${ch.formsText} Só entram os últimos 30 dias, e shiny só se compara com shiny. Pesam mais as vendas de PvE, Nota e nível parecidos e as mais recentes. Com poucas vendas parecidas ${ch.of}, entram outras espécies, com bem menos peso: primeiro as com os mesmos dois tipos, depois com um tipo em comum, depois todas.`),
   para('PvE, Nota e nível.',ch.powerText),
   para('Peso neste preço.',`${share}% do cálculo vem das ${gems(r.familyCount)} vendas ${ch.of}; os outros ${100-share}% vêm das demais vendas. É o peso no cálculo, não a quantidade de vendas.`));
  if(c)details.append(para(`Confiança ${c.percent}%.`,`Em vendas como esta, cerca de ${c.percent} em cada 100 costumam sair a até 25% do Preço justo.`));
  // Parte técnica, no mesmo dropdown.
  const how=[el('h4',null,'Detalhes técnicos'),
   para('Pesos.','Uma venda de duas semanas atrás vale metade de uma de hoje. Uma venda com PvE 19% diferente, ou com Nota 0,35 diferente, também vale metade.'),
   para('Referência do mercado.','Todas as vendas do mesmo tipo (shiny ou não) formam uma curva de quanto o mercado paga por PvE, Nota e nível. A Nota é a que mais pesa; o nível quase não muda o preço até o Nv 100 e sobe depois. De cada venda entra só o quanto ela saiu acima ou abaixo dessa curva, e não o preço: é assim que outra espécie ajuda sem copiar o preço dela.'),
   ...(precos.correcao?.bias?[para('Correção.',`Nas vendas dos últimos ${precos.correcao.dias} dias, o cálculo saía em média ${pct(Math.abs(Math.exp(precos.correcao.bias)-1))}% ${precos.correcao.bias>0?'acima':'abaixo'} do valor pago. Esse desvio já vem descontado dos três números.`)]:[]),
   para('Adicionais.','Cada um conta 10 unidades do item (fragmentos de Z-Move ou AoE, pedras Mega) pela mediana do menor anúncio do dia. O valor sai de cada venda antes da comparação e volta no fim, pelo preço de hoje.'),
   para('Adicional incerto.',`O jogo mostra o AoE e o Z-Move de hoje, não os da venda. Na dúvida, o valor deles não é descontado, para o cálculo errar para cima, e o risco aparece na confiança.${u.family?` Aqui, ${gems(u.family)} das ${gems(r.familyCount)} vendas ${ch.of} estão nesse caso.`:''}`),
   para('Refino.','Os Pokémon são comparados sem refino: uma venda refinada conta como se não tivesse refino.')];
  if(c&&r.confidenceParts){
   const parts=el('ul','parts');for(const [k,label]of Object.entries(PART_LABELS)){const item=el('li');item.append(el('span',null,label),el('b',null,String(Math.round(r.confidenceParts[k]*100))));parts.append(item);}
   const avg=Math.round(Object.values(r.confidenceParts).reduce((s,x)=>s+x,0)/4*100);
   how.push(para('De onde vem a confiança?',`Quatro notas de 0 a 100, com pesos aprendidos nas vendas recentes (a média simples daria ${avg}). "${topPart()}" é a que mais pesa, e juntas elas dão ${Math.round(c.chance*100)}%, arredondados para ${c.percent}%. O que mais puxou para baixo: ${REASONS[c.lowest]}.`),parts);
  }
  details.append(...how);
  const proof=[];
  if(t?.precificadas){
   const times=t.erroMediano.toLocaleString('pt-BR',{maximumFractionDigits:1}),list=el('ul');
   list.append(li(`${pct(t.dentroDaFaixa)}% saíram entre Vender rápido e Esperar.`),li(`${pct(t.ate25)}% saíram a até 25% do Preço justo (mais ou menos 1 em cada ${Math.round(1/t.ate25)}).`),
    li(`Em metade das vendas, o preço pago ficou a até ${times} vez do Preço justo, para mais ou para menos.`),
    li(Math.abs(t.vies)<.01?'Em geral, o Preço justo ficou alinhado ao valor pago (já com a correção).':t.vies>0?`Em geral, o Preço justo ficou ${pct(t.vies)}% acima do valor pago.`:`Em geral, o Preço justo ficou ${pct(-t.vies)}% abaixo do valor pago.`));
   proof.push(el('p',null,`Calculamos o preço de ${gems(t.vendas)} vendas reais, cada uma usando só as vendas que aconteceram antes dela, como se fosse a primeira vez:`),list,...generic(t,'h5'),
    el('p',null,'O que isso quer dizer: o mercado é feito por jogadores e varia muito; dois Pokémon quase iguais podem sair por preços bem diferentes no mesmo dia. Use a faixa entre Vender rápido e Esperar, não só o número do meio.'));
  }
  const cal=precos.confianca,rows=(cal?.conferencia?.faixas||[]).filter(f=>f.vendas>=30);
  if(rows.length){
   const mine=c&&rows.find(f=>f.confianca===c.percent);
   proof.push(el('h5',null,'A confiança acerta?'),el('p',null,`Para conferir, deixamos de fora as vendas dos ${cal.conferencia.dias} últimos dias, ajustamos a confiança com os dias anteriores e comparamos o que ela dizia com o que aconteceu nesses ${cal.conferencia.dias} dias.${mine?` Quando dizemos ${mine.confianca}%, na prática ${pct(mine.acerto)}% das vendas ficaram a até 25% do Preço justo.`:''}`));
   const tb=el('table'),head=el('tr'),body=el('tbody');tb.append(el('thead'),body);tb.tHead.append(head);
   for(const h of ['Confiança dita','Vendas','Saíram a até 25%'])head.append(el('th',null,h));
   for(const f of rows){const tr=el('tr');tr.append(el('td',null,f.confianca+'%'),el('td',null,gems(f.vendas)),el('td',null,pct(f.acerto)+'%'));body.append(tr);}
   const wrap=el('div','tablewrap');wrap.append(tb);proof.push(wrap,el('p','small muted','Faixas com menos de 30 vendas ficam de fora (amostra pequena).'));
  }
  proof.push(el('p','small muted',`Vendas lidas em ${when(Date.parse(precos.geradoEm))}.`));
  details.append(...proof);
  return details;
 }

 // Vendas da cadeia evolutiva que mais pesaram no preço (até 30), com a Proximidade de cada uma (nível, Poder, Nota e data; 100% = idêntica
 // e vendida hoje). Abre pela Proximidade,
 // com 10 linhas e "Mostrar mais". Ordenação pelo cabeçalho: 1º clique do maior para o menor, 2º inverte.
 const share=x=>!Number.isFinite(x)?'–':x>=.001?(x*100).toLocaleString('pt-BR',{maximumFractionDigits:x>=.1?0:1})+'%':'< 0,1%';
 function salesTable(comps,showForm){
  const cols=[{key:'closeness',label:'Proximidade'},{key:'share',label:'Peso'},{key:'level',label:'Nível'},{key:'nota',label:'Nota'},{key:'pve',label:'PvE'},{key:'at',label:'Data'},{key:'price',label:'Gemas'}];
  let sort={key:'closeness',dir:'desc'},open=false;const FIRST=10;
  const table=el('table','sales'),head=el('tr'),body=el('tbody'),more=el('button','toggle');table.append(el('thead'),body);table.tHead.append(head);more.type='button';
  more.addEventListener('click',()=>{open=!open;draw();});
  function draw(){
   const obsHead=el('th','obs','Observação');obsHead.scope='col';
   const formHead=el('th',null,'Forma');formHead.scope='col';
   head.replaceChildren(...(showForm?[formHead]:[]),...cols.map(c=>{const th=el('th');th.scope='col';const b=el('button',null,c.label+(sort.key===c.key?(sort.dir==='asc'?' ↑':' ↓'):''));b.type='button';
    if(sort.key===c.key)th.setAttribute('aria-sort',sort.dir==='asc'?'ascending':'descending');
    if(c.key==='share')th.title='Quanto esta venda conta de fato no preço. É uma mediana: uma venda muito cara ou muito barata conta como uma venda acima ou abaixo do meio, não pelo valor.';
    if(c.key==='price')th.title='Valor pago na venda, com os Adicionais dela (pelo preço daquele dia)';
    if(c.key==='pve')th.title='PvE sem Adicionais, no Nv 100 e na última evolução. Por isso costuma ser diferente do Poder que a ficha mostra, calculado no nível e na forma atuais.';
    if(c.key==='closeness')th.title='O quanto esta venda se parece com o seu Pokémon em nível, PvE, Nota e data (100% = idêntica e vendida hoje). Não olha o preço pago.';
    b.onclick=()=>{sort=sort.key===c.key?{key:c.key,dir:sort.dir==='asc'?'desc':'asc'}:{key:c.key,dir:'desc'};draw();};th.append(b);return th;}),obsHead);
   const sign=sort.dir==='asc'?1:-1,list=[...comps].sort((a,b)=>((a[sort.key]??-1)-(b[sort.key]??-1))*sign||b.at-a.at);
   body.replaceChildren(...list.slice(0,open?list.length:FIRST).map(c=>{
    const tr=el('tr'),price=el('td',null,gems(c.price));
    // Observação numa coluna própria: só o Adicional incerto (o refino é explicado na auditoria, não aqui).
    const obs=el('td','obs'),marks=[];
    if(c.uncertain){const m=el('span','warn','Adicional incerto');m.title='O jogo mostra o AoE e o Z-Move que o Pokémon tem hoje: esta venda foi lida depois e eles podem ter sido aplicados pelo comprador';marks.push(m);}
    marks.forEach((m,i)=>{if(i)obs.append(' · ');obs.append(m);});
    tr.title=`${c.name}${c.shiny?' shiny':''}`;
    if(showForm)tr.append(el('td',null,c.name));
    tr.append(el('td',null,share(c.closeness)),el('td',null,share(c.share)),el('td',null,gems(c.level)),el('td',null,Number.isFinite(c.nota)?METRICS.nota.fmt(c.nota):'–'),el('td',null,Number.isFinite(c.pve)?gems(c.pve):'–'),el('td',null,when(c.at)),price,obs);return tr;}));
   more.hidden=list.length<=FIRST;more.textContent=open?'Mostrar menos':`Mostrar mais (${list.length-FIRST})`;
  }
  draw();const wrap=el('div','tablewrap');wrap.append(table);const box=el('div');box.append(wrap,more);return box;
 }

 // Números da ficha ao lado da sprite, os mesmos dos tooltips do gráfico e da tabela de vendas.
 function sheetStats(r){const box=el('div','sheetstats small'),item=(label,value,title)=>{const s=el('span');if(label)s.append(el('i',null,label+' '));s.append(el('b',null,value));if(title)s.title=title;box.append(s);};
  if(Number.isFinite(r.nota))item('Nota',METRICS.nota.fmt(r.nota));if(Number.isFinite(r.pve))item('Poder no PvE',gems(r.pve),'Sem Adicionais, no Nv 100 e na última evolução');
  if(Number.isInteger(r.potencia))item('','P'+r.potencia,'Potência');if(Number.isFinite(r.quality))item('Qualidade',r.quality.toLocaleString('pt-BR',{maximumFractionDigits:2}));if(r.ivSum)item('IV',String(r.ivSum));
  return box;}
 // Preço por nível (04/11/2026): a mesma ficha em outros níveis (levelPrices), para o usuário ver quanto ganha
 // upando antes de vender. Nível em escala log; faixa entre Vender rápido e Esperar; o ponto amarelo é o nível atual.
 function levelChart(r){
  // Só o Pokémon (sem Adicionais): é a parte que muda ao upar; os Adicionais somam o mesmo em qualquer nível.
  const add=r.median-r.base,pts=r.byLevel||[];if(pts.length<3)return [];
  // Mesmo tamanho e margens do gráfico de vendas ao lado (scatter), para os quadros ficarem alinhados.
  const W=340,H=222,L=50,R=334,T=10,B=176,lx0=Math.log(pts[0].level),lx1=Math.log(pts.at(-1).level),top=Math.max(...pts.map(p=>p.high))*1.05;
  const X=lv=>L+(Math.log(lv)-lx0)/(lx1-lx0||1)*(R-L),Y=v=>B-v/top*(B-T);
  const chart=svg('svg',{viewBox:`0 0 ${W} ${H}`,class:'scatter levels',role:'img'});
  chart.append(svg('rect',{class:'frame',x:L,y:T,width:R-L,height:B-T}));
  chart.append(svg('polygon',{class:'band',points:[...pts.map(p=>`${X(p.level)},${Y(p.high)}`),...[...pts].reverse().map(p=>`${X(p.level)},${Y(p.low)}`)].join(' ')}));
  chart.append(svg('polyline',{class:'line',points:pts.map(p=>`${X(p.level)},${Y(p.median)}`).join(' ')}));
  const now=pts.find(p=>p.current),drop=pts.find(p=>p.drop);
  // Rótulos do eixo sem sobrepor (04/11/2026): o nível atual e o da hunt sempre; 100, 1.000 e o último só se couberem.
  // Largura estimada pelo número de letras (11 px); perto da borda o texto alinha para dentro.
  const placed=[],label=(p,text,cls)=>{const w=text.length*6.2,x=X(p.level),a=x-w/2<L-8?'start':x+w/2>W-2?'end':'middle',x0=a==='start'?x:a==='end'?x-w:x-w/2;
   if(placed.some(([b0,b1])=>x0<b1+6&&x0+w>b0-6))return;placed.push([x0,x0+w]);chart.append(svg('text',{class:cls||'',x,y:B+14,'text-anchor':a},text));};
  for(const p of pts){const dot=svg('circle',{class:p.current?'me':'pt',cx:X(p.level),cy:Y(p.median),r:p.current?6:3.5});dot.append(svg('title',null,`Nv ${gems(p.level)}: Pokémon ${gems(p.median)} Gemas sem Adicionais (${gems(p.low)} a ${gems(p.high)})`));chart.append(dot);
  }
  label(now,'Nv '+gems(now.level),'minelabel');if(drop&&!drop.current)label(drop,`Nv ${gems(drop.level)} (hunt)`);
  for(const lv of [100,1000,pts.at(-1).level,pts[0].level]){const p=pts.find(x=>x.level===lv);if(p&&!p.current&&!p.drop)label(p,gems(lv));}
  chart.append(svg('text',{x:L-6,y:B,'text-anchor':'end'},'0'),svg('text',{x:L-6,y:T+8,'text-anchor':'end'},gems(Math.round(top))));
  chart.append(svg('text',{class:'axisname',x:(L+R)/2,y:H-8,'text-anchor':'middle'},'Nível →'),svg('text',{class:'axisname',x:14,y:(T+B)/2,'text-anchor':'middle',transform:`rotate(-90 14 ${(T+B)/2})`},'Pokémon (Gemas) →'));
  const up=pts.filter(p=>p.level>now.level&&[200,500,1000,2000,5000,10000].includes(p.level)).slice(0,3);
  const nodes=[el('h4',null,'Preço por nível'),chart,el('p','small',`A mesma ficha em outros níveis, sem Adicionais${add>0?` (eles somam ${gems(add)} Gemas em qualquer nível)`:''}.${Number.isFinite(r.dropLevel)?` Começa no Nv ${gems(r.dropLevel)}, o nível da hunt.`:''} Cada ponto é calculado como se a ficha estivesse naquele nível. Subir de nível não baixa o preço: se as vendas parecidas de um nível derem menos, fica o valor do nível anterior.`)];
  if(up.length)nodes.push(el('p','small',`Se upar antes de vender: ${up.map(p=>`Nv ${gems(p.level)} ≈ ${gems(p.median)} Gemas (+${pct(p.median/now.median-1)}%)`).join(' · ')}.`));
  return nodes;
 }
 // Por que a confiança é baixa (revisão de 04/11/2026, texto sugerido pelo usuário): as partes que mais tiraram, pelo
 // peso de cada uma na calibração (peso × o que falta para 1), do maior para o menor; entram as que tiram ao menos 60%
 // do que a principal tira, até três. Uma frase por motivo.
 function lowReasons(r){
  const parts=r.confidenceParts||{},W=precos.confianca?.pesos||P.CONFIDENCE.weights,of=chainOf(r).of;
  const loss=P.CONFIDENCE.keys.map((k,i)=>({k,v:W[i+1]*(1-(parts[k]??1))})).sort((a,b)=>b.v-a.v),top=loss[0].v;
  // "Comparáveis" é por peso (Poder, Nota, nível e data), não por quantidade: a cadeia evolutiva pode ter muitas vendas e nenhuma
  // comparável. O número equivalente (cadeia evolutiva + espécies dos mesmos tipos) sai da Proximidade (n ÷ (n + 5)); pela conta do
  // motor (soma² ÷ soma dos quadrados) ele é 0 ou pelo menos 1, então o arredondamento da volta nunca pode dar "menos de 1".
  return reasonTexts({keys:loss.filter(x=>x.v>0&&x.v>=top*.6).slice(0,3).map(x=>x.k),proximidade:parts.proximidade??0,
   ampliacao:parts.ampliacao??1,of,familyCount:r.familyCount||0,shiny:r.shiny});
 }
 // Só o texto, a partir das variáveis (testável sem precificar nada).
 function reasonTexts({keys,proximidade:p,ampliacao:a,of,familyCount:fc,shiny}){
  const n=p<=0?0:p>=1?99:Math.max(1,Math.round(5*p/(1-p))),kind=shiny?'shiny':'não shiny';
  const total=fc>0?`${fc===1?'é 1 venda':`são ${gems(fc)} vendas`} ${kind} no total`:`nenhuma venda ${kind}`;
  const eq=n===1?'equivale a uma venda só':n<10?`equivale a só cerca de ${n} vendas`:`equivale a cerca de ${n>=99?'100 ou mais':n} vendas`;
  const famPart=fc===0?`nenhuma é ${of} (${total})`:a<.1?`quase nada vem ${of} (${total})`:`pouco vem ${of} (${total})`;
  const text={
   proximidade:n===0?`Nenhuma venda ${of} ou de espécies dos mesmos tipos é parecida com este Pokémon: o preço vem de espécies com outros tipos.`
    :`${n<10?'Poucas vendas comparáveis: o':'O'} peso das vendas parecidas, ${of} e de espécies dos mesmos tipos, ${eq}.`,
   ampliacao:fc===0?`Não há vendas ${kind} ${of}: o preço vem de outras espécies.`
    :fc===1?(a<.1?`A única venda ${kind} ${of} é pouco parecida com este Pokémon: o preço vem de outras espécies.`
     :`Há só 1 venda ${kind} ${of}: parte do preço vem de outras espécies.`)
    :a<.1?`Quase nenhuma venda ${of} é parecida com este Pokémon (${total}): o preço vem de outras espécies.`
    :`Poucas vendas ${of} são parecidas com este Pokémon (${total}): parte do preço vem de outras espécies.`,
   consistencia:'Os preços dessas vendas variam muito entre si.',
   certeza:'Muitas vendas têm Adicional incerto: o AoE ou o Z-Move podem ter sido aplicados depois da venda, o que distorce a comparação.'};
  keys=[...keys];
  // Cadeia evolutiva e vendas comparáveis juntas viram uma frase só (as duas falam de falta de vendas comparáveis).
  if(keys.includes('ampliacao')&&keys.includes('proximidade')){
   text.proximidade=n===0?`Nenhuma venda parecida com este Pokémon, nem ${of} (${total}) nem de espécies dos mesmos tipos: o preço vem de espécies com outros tipos.`
    :`Poucas vendas comparáveis: o peso das vendas parecidas ${eq}, e ${famPart}; o resto vem de outras espécies.`;
   keys.splice(keys.indexOf('ampliacao'),1);}
  return (keys.length?keys:['proximidade']).map(k=>text[k]);
 }
 // Confiança e preço (04/11/2026): "Por que a confiança é baixa" (lista) e "Como chegamos ao preço" (as vendas da cadeia evolutiva
 // que mais pesaram, média ponderada pelo peso em escala log, com o nível e a Nota delas, contra este Pokémon).
 function priceStory(r){
  // A causa só é citada quando a diferença (nível 1,5× ou Nota 0,15) puxa para o mesmo lado do resultado. Peso da cadeia evolutiva
  // e correção do viés ficam na auditoria; o que a coluna Gemas mostra fica no título dela.
  const comps=r.available?(r.comps||[]).filter(x=>x.share>0&&x.base>0):[],W=comps.reduce((t,x)=>t+x.share,0);
  if(W>0){
   const avg=f=>Math.exp(comps.reduce((t,x)=>t+x.share*Math.log(f(x)),0)/W),paid=Math.round(avg(x=>x.base)),lv=Math.round(avg(x=>x.level));
   const nn=comps.filter(x=>Number.isFinite(x.nota)),NW=nn.reduce((t,x)=>t+x.share,0),nota=NW>0?nn.reduce((t,x)=>t+x.share*x.nota,0)/NW:null;
   const mine=Number.isFinite(r.notaPreco)?r.notaPreco:Number.isFinite(r.nota)?r.nota:null,hasNota=nota!=null&&mine!=null;
   const side=r.base>paid*1.05?1:r.base<paid/1.05?-1:0,lvSide=r.level>=lv*1.5?1:r.level<=lv/1.5?-1:0,notaSide=hasNota&&Math.abs(mine-nota)>=.15?Math.sign(mine-nota):0;
   const causes=[...(side&&lvSide===side?[side>0?'nível mais alto':'nível mais baixo']:[]),...(side&&notaSide===side?[side>0?'Nota maior':'Nota menor']:[])];
   const fmt=(l,n)=>`Nv ${gems(l)}${hasNota?` e Nota ${METRICS.nota.fmt(n)}`:''}`;
   const g=n=>`${gems(n)} ${Math.round(n)===1?'Gema':'Gemas'}`,one=comps.length===1;
   // Sem causa citada e preço diferente da média: a diferença vem do Poder e das outras vendas da comparação.
   const link=causes.length?`, ou seja, tem ${causes.join(' e ')}, então estimamos`:side?'; pelo PvE dele e pelas outras vendas da comparação, estimamos':'; estimamos';
   return `${one?`A venda ${chainOf(r).of} mais parecida saiu por`:`As vendas ${chainOf(r).of} mais parecidas saíram, em média, por`} ${g(paid)} (sem Adicionais), com ${fmt(lv,nota)}. Este Pokémon tem ${fmt(r.level,mine)}${link} ${g(r.base)}.`;
  }
  return null;
 }
 function whyList(r){
  const box=el('div','why whybox small'),c=r.confidence,head=(text,cls)=>box.append(el('h5',cls,text));
  if(r.available&&c&&c.percent<60){
   head(c.percent<20?'Por que a confiança é muito baixa?':c.percent<40?'Por que a confiança é baixa?':'Por que a confiança não é maior?',c.percent<20?'warn':null);
   const ul=el('ul');for(const t of lowReasons(r))ul.append(el('li',null,t));box.append(ul);
  }
  if(r.missing?.length){const m=r.missing,list=m.length>1?`${m.slice(0,-1).join(', ')} e ${m.at(-1)}`:m[0];box.append(el('p','warn',`${m.length>1?'Adicionais':'Adicional'} sem cotação: ${list} ${m.length>1?'ficaram':'ficou'} fora do total.`));}
  return box;
 }
 // Régua de Vender rápido a Esperar: a marca fica onde o Preço justo cai (escala log), e as legendas dizem, pelo teste, quantas vendas saem fora de cada ponta.
 function ruler(r){
  const track=el('div','track'),mark=el('i','mark'),span=Math.log(r.high/r.low);mark.style.left=`${span>0?Math.min(96,Math.max(4,Math.log(r.median/r.low)/span*100)):50}%`;track.append(mark);
  track.setAttribute('role','img');track.setAttribute('aria-label',`Preço justo de ${gems(r.median)} Gemas, entre ${gems(r.low)} e ${gems(r.high)}`);
  const t=precos.teste,one=x=>`1 em cada ${Math.round(1/x)} vendas`,legend=el('div','rulerlegend small muted');
  if(!t?.abaixo||!t?.acima)return [track];
  legend.title='Pelo teste com vendas reais de todas as espécies, não só deste Pokémon';legend.append(el('span',null,`${one(t.abaixo)} sai abaixo de Vender rápido`),el('span',null,`${one(t.acima)} sai acima de Esperar`));
  return [track,legend];
 }
 function render(r){
  const nodes=[],who=el('div','who'),title=el('div');
  title.append(el('h3',null,`${r.name}${r.shiny?' shiny':''} · Nv ${gems(r.level)}`),types(r.types),sheetStats(r),tags(r));who.append(sprite(r.speciesId,r.shiny,false),title);nodes.push(who);
  if(r.simFrom)nodes.push(el('p','small simnote',`Simulação a partir da ficha de ${r.simFrom.name} Nv ${gems(r.simFrom.level)}.${r.speciesId!==r.simFrom.id&&megaBaseOf(r.speciesId)!==r.simFrom.id?' Não inclui o custo de evoluir.':''}`));
  if(!r.available)nodes.push(el('p','error','Poucas vendas para comparar este Pokémon.'));
  else{
   const prices=el('div','prices ruler');
   for(const [key,label]of [['low','Vender rápido'],['median','Preço justo'],['high','Esperar']]){const box=el('div','price'+(key==='median'?' main':''));box.append(el('span',null,label),el('b',null,gems(r[key])));prices.append(box);}
   nodes.push(prices,...ruler(r));
   if(r.parts.length){const parts=el('ul','parts'),row=(label,value,cls)=>{const li=el('li',cls);li.append(el('span',null,label),el('b',null,value));parts.append(li);};
    row('Pokémon',gems(r.base));
    for(const p of r.parts)parts.append(addonRow(p));
    nodes.push(parts);}
   if(r.parts.length)nodes.push(el('p','muted small','O valor por unidade vem da última cotação lida. Clique nele para trocar.'));
   // Confiança do Preço justo: de 10 em 10; vermelha abaixo de 20% (com aviso), amarela de 20% a 60% (com o que mais
   // pesou para baixo), verde de 60% para cima. O detalhe fica na auditoria.
   if(r.confidence){const c=r.confidence,box=el('div','confidence '+(c.percent<20?'low':c.percent<60?'mid':'high')),bar=el('div','meter'),fill=el('i');
    fill.style.width=c.percent+'%';bar.append(fill);bar.setAttribute('aria-hidden','true');
    box.append(el('b',null,`Confiança ${c.percent}%`),bar);nodes.push(box);}
  }
  // "Confiança e preço" (04/11/2026): os tópicos à vista, com altura máxima e rolagem; abaixo de 20% o aviso fica fora.
  const why=whyList(r);
  if(r.confidence&&r.confidence.percent<20)nodes.push(el('p','note small warn','Confiança baixa: use o preço só como referência.'));
  if(why.childNodes.length){why.classList.add('whybox');why.tabIndex=0;why.setAttribute('aria-label','Confiança e preço');nodes.push(why);}
  // Layout (04/11/2026): a ficha e o preço lado a lado; gráficos, auditoria e vendas embaixo, em largura total.
  const below=[];
  // O gráfico da espécie fica sempre à vista; sem vendas suficientes dela, o gráfico geral do teste.
  // Os dois gráficos lado a lado (no celular, um embaixo do outro); auditoria e tabela de vendas abaixo deles.
  if(r.available){const chart=familyChart(r),left=el('div','chartcol'),right=el('div','chartcol'),levels=levelChart(r),row=el('div',levels.length?'chartrow':null);
   const head=(title,tools)=>{const h=el('div','charthead');h.append(el('h4',null,title));if(tools)h.append(tools);return h;};
   if(chart){const [tools,...rest]=chart;left.append(head(`Vendas ${chainOf(r).of}`,tools),...rest);}else left.append(...(precos.teste?.precificadas?generic(precos.teste,'h4'):[]));
   row.append(left);if(levels.length){const [,...rest]=levels;right.append(head('Preço por nível'),...rest);row.append(right);}
   below.push(row);}
  if(r.comps?.length){below.push(el("h4",null,`Vendas ${chainOf(r).of} que mais pesaram no preço`));
   // Cadeia evolutiva com pouco peso (04/11/2026): avisa que o preço veio de outras espécies, para a tabela não parecer a base dele.
   if((r.weight||0)<.1)below.push(el('p','small muted',`Só ${pct(r.weight||0)<1?'menos de 1':pct(r.weight||0)}% do preço vem destas vendas ${chainOf(r).of}: o resto vem de outras espécies, primeiro as com os mesmos tipos.`));
   below.push(salesTable(r.comps,chainOf(r).hasChain));}
  // Auditoria por último na página (04/11/2026), depois dos gráficos e da tabela de vendas.
  if(r.available)below.push(confidence(precos.teste,r));
  show(nodes,below);
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
 // Nota da ficha (ou calculada, se a ficha não tiver) e a melhor nota entre as últimas evoluções, sem Mega.
 const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
 const speciesOf=sheet=>[...central.species.values()].find(s=>norm(s.n)===norm(sheet.nome));
 // Nota que vai para o preço (04/11/2026: a Curva do mercado e o peso das vendas parecidas usam a Nota).
 function notaOf(sheet){if(Number.isFinite(sheet.nota))return sheet.nota;const e=speciesOf(sheet);const v=e?PokeIdleNota.create(central.species).nota(e.id,sheet):null;return Number.isFinite(v)?v:null;}
 function notaLock(sheet){
  const e=speciesOf(sheet);if(!e)return null;
  const N=PokeIdleNota.create(central.species),now=notaOf(sheet);
  if(!Number.isFinite(now)||now>=PokeIdleNota.MIN)return null;
  const finals=central.finals(e.id,false),best=Math.max(now,...finals.map(f=>N.nota(f.id,sheet)??-1));
  if(best>=PokeIdleNota.MIN)return null;
  const fmt=v=>v.toLocaleString('pt-BR',{maximumFractionDigits:2});
  return `Nota ${fmt(now)}: abaixo de 3,5${finals.some(f=>f.id!==e.id)?` e nem na última evolução chega a 3,5 (no máximo ${fmt(best)})`:''}. O precificador não calcula preço para Pokémon com nota abaixo de 3,5.`;
 }
 // Simular (06/11/2026): a mesma ficha numa evolução à frente ou num nível maior, pelo mesmo cálculo de uma ficha colada.
 // Só para a frente: quem já evoluiu ou upou não volta. A Nota é a calculada para a forma; a Mega soma a pedra.
 function formsAhead(e){const out=[],seen=new Set(),visit=id=>{const s=central.species.get(id);if(!s||seen.has(id))return;seen.add(id);out.push(s);for(const k of s.evo||[])visit(k);for(const m of central.megas.get(id)||[])visit(m);};visit(e.id);return out;}
 function setupSim(sheet,keep){
  const e=speciesOf(sheet),select=$('simforma'),level=$('simnivel');
  $('sim').hidden=!e||!(sheet.level>0);if($('sim').hidden)return;
  const forms=formsAhead(e),chosen=keep&&select.value?select.value:String(e.id);
  select.replaceChildren(...forms.map(f=>{const o=el('option',null,f.n);o.value=String(f.id);return o;}));
  select.value=chosen;$('simformabox').hidden=forms.length<2;
  level.min=String(sheet.level);level.max=String(Math.max(MAX_LEVEL,sheet.level));if(!keep)level.value=String(sheet.level);
 }
 function simulated(sheet){
  const e=speciesOf(sheet);if(!e||$('sim').hidden)return null;
  const form=central.species.get(Number($('simforma').value))||e,typed=Math.round(Number($('simnivel').value))||sheet.level,level=Math.max(sheet.level,Math.min(Math.max(MAX_LEVEL,sheet.level),typed));
  $('simnivel').value=String(level);
  const same=form.id===e.id&&level===sheet.level;$('simlimpar').hidden=same;if(same)return null;
  return {...sheet,nome:form.n,level,nota:form.id===e.id?sheet.nota:PokeIdleNota.create(central.species).nota(form.id,sheet)};
 }
 function clearSim(){$('simforma').value=String(speciesOf(lastSheet).id);$('simnivel').value=String(lastSheet.level);compute();}
 function price(event){
  event.preventDefault();
  $('sim').hidden=true;
  const text=$('ficha').value;if(!text.trim())return error('Cole o texto do botão "Copiar p/ ChatGPT" da ficha.');
  const sheet=PokeIdleFicha.parse(text);
  if(!sheet.nome)return error('Não encontrei a espécie no texto. Use o botão "Copiar p/ ChatGPT" da ficha e cole o texto inteiro.');
  const keep=keyOf(sheet)===pricedKey;pricedKey=keyOf(sheet);$('reset').hidden=true;
  // Trava de nota (03/11/2026): abaixo de 3,5 só precifica se a última evolução chegar a 3,5 (Mega não conta).
  const lock=notaLock(sheet);if(lock)return error(lock);
  lastSheet=sheet;setupSim(sheet,keep);compute();
 }
 // Preço por unidade dos Adicionais digitado pelo usuário (itemId → Gemas), guardado neste navegador: vale só para os
 // Adicionais deste Pokémon; as vendas comparadas continuam com o preço do item no dia de cada venda.
 const ITEM_KEY='precificador-adicionais-v1';let lastSheet=null;
 const loadItems=()=>{try{const v=JSON.parse(localStorage.getItem(ITEM_KEY)||'{}');return v&&typeof v==='object'?v:{};}catch{return {};}};
 const saveItems=v=>{try{localStorage.setItem(ITEM_KEY,JSON.stringify(v));}catch{}};
 function setItem(id,unit){const v=loadItems();if(unit>0)v[id]=unit;else delete v[id];saveItems(v);compute();}
 // Cada ponto do gráfico refaz o cálculo de uma ficha colada naquele nível, para bater com o simulador. O byLevel do motor só
 // aplica o fator da curva geral e mantém as vendas parecidas do nível atual; ele divergia até ~19% no Nv 1000 (06/11/2026).
 // Mais nível não baixa o preço (pedido do usuário): uma queda é acaso das vendas daquele nível. A partir da ficha colada (anchor),
 // que fica como o motor calculou, cada nível para cima fica no máximo até ali e cada um para baixo no mínimo.
 const fits={};
 function levelPrices(input,r,anchor){
  if(!r.available)return [];
  const fit=fits[r.shiny]??=P.marketFit(rows.filter(x=>x.shiny===r.shiny)),quote=P.itemQuotes(precos.itens),now=Date.parse(precos.geradoEm),bias=precos.correcao?.bias;
  const opts={addons:0,typesOf:id=>central.species.get(id)?.t||[],megaUnit:(shiny,at)=>quote(shiny?P.MEGA_SHINY:P.MEGA,at)??0,weights:precos.confianca?.pesos,fit,...(Number.isFinite(bias)?{bias}:{})};
  const out=[],grid=[...(r.byLevel||[])];if(!grid.some(p=>p.level===anchor))grid.push({level:anchor,current:false,drop:false});grid.sort((a,b)=>a.level-b.level);
  for(const p of grid){
   const target=P.describe(central,{speciesId:r.speciesId,level:p.level,potencia:input.potencia,quality:input.quality,shiny:r.shiny,ivs:input.ivs,tmElemental:input.tmElemental,tmAoe:input.tmAoe,refino:{}});
   const e=target&&P.neighbors({...target,at:now,nota:Number.isFinite(input.nota)?input.nota:null},rows,opts);
   if(e)out.push({level:p.level,current:p.current,drop:p.drop,low:e.low,median:e.median,high:e.high});
  }
  const i=out.findIndex(p=>p.level===anchor);if(i<0)return out;
  const hold=(p,q,f)=>{for(const k of ['low','median','high'])p[k]=f(p[k],q[k]);};
  for(let j=i+1;j<out.length;j++)hold(out[j],out[j-1],Math.max);
  for(let j=i-1;j>=0;j--)hold(out[j],out[j+1],Math.min);
  return out;
 }
 function compute(){
  if(!lastSheet)return;
  const sim=simulated(lastSheet),sheet=sim||lastSheet,simFrom=sim?{name:speciesOf(lastSheet).n,id:speciesOf(lastSheet).id,level:lastSheet.level}:null;
  // O tipo do Z-Move não muda o preço (o fragmento é o mesmo): vai um tipo qualquer e a linha mostra só "Z-Move".
  try{const input={...sheet,nota:notaOf(sheet),tmElemental:$('zmove').checked?'NORMAL':null,tmAoe:$('aoe').checked},r=P.priceSheet(central,input,{rows,itemPrices:precos.itens,currentItems:loadItems(),now:Date.parse(precos.geradoEm),confidenceWeights:precos.confianca?.pesos,bias:precos.correcao?.bias});
   const byLevel=levelPrices(input,r,lastSheet.level),here=sim&&r.available&&byLevel.find(p=>p.current),add=r.median-r.base;
   // Simulação de nível: o preço é o mesmo ponto do gráfico.
   if(here)Object.assign(r,{low:here.low+add,median:here.median+add,high:here.high+add,base:here.median});
   render({...r,byLevel,simFrom,nota:sheet.nota,notaPreco:notaOf(sheet),potencia:sheet.potencia,quality:sheet.quality,ivSum:Object.values(sheet.ivs||{}).reduce((s,v)=>s+v,0),parts:r.parts.map(p=>/^Z-Move/.test(p.label)?{...p,label:'Z-Move'}:p),missing:(r.missing||[]).map(l=>/^Z-Move/.test(l)?'Z-Move':l)});}
  catch(e){error(e.message);}
 }
 // Linha de um Adicional com o preço por unidade editável (Enter ou sair do campo recalcula; "cotação" volta ao do dia).
 function addonRow(p){
  const li=el('li','sub'),label=el('span'),input=el('input','unit');input.type='number';input.min='1';input.step='1';input.inputMode='numeric';
  input.value=p.unit!=null?String(Math.round(p.unit)):'';input.setAttribute('aria-label',`Preço de 1 unidade de ${p.label}, em Gemas`);
  const mine=Number(loadItems()[p.id])>0;input.title=mine?'Seu valor (guardado neste navegador)':`Cotação de ${p.quote!=null?gems(p.quote):'?'} Gemas por unidade`;
  const apply=()=>{const v=Math.round(Number(input.value));if(v>0&&v!==Math.round(p.unit||0))setItem(p.id,v);};
  input.addEventListener('change',apply);input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();apply();}});
  const calc=el('span','addoncalc');calc.append(`${p.quantity} × `,input);label.append(p.label,calc);
  if(mine){const back=el('button','link','cotação');back.type='button';back.title=`Voltar à última cotação lida (${p.quote!=null?gems(p.quote):'?'})`;back.addEventListener('click',()=>setItem(p.id,0));label.append(' ',back);}
  li.append(label,el('b',null,p.total!=null?gems(p.total):'sem cotação'));return li;
 }
 async function start(){
  $('form').addEventListener('submit',price);$('ficha').addEventListener('input',pasted);
  for(const id of ADDONS)$(id).addEventListener('change',()=>{$('reset').hidden=true;});
  $('simforma').addEventListener('change',compute);$('simnivel').addEventListener('change',compute);$('simlimpar').addEventListener('click',clearSim);
  $('simnivel').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();compute();}});
  try{
   const response=await fetch('precos.json',{cache:'no-cache'});if(!response.ok)throw Error(response.status);
   precos=await response.json();rows=PokeIdleCentral.linhas(precos);central=PokeIdleCentral.create(window);
   $('status').textContent=`Vendas lidas em ${when(Date.parse(precos.geradoEm))} · ${gems(precos.vendas.length)} vendas dos últimos ${precos.janelaDias} dias.`;
   $('go').disabled=false;
  }catch(e){$('status').textContent='Não foi possível carregar as vendas. Recarregue a página.';$('status').classList.add('warn');}
 }
 start();
})();
