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

 // Dispersão das vendas reais da família deste Pokémon (mesmo shiny, 30 dias): preço sem os Adicionais (escala log) ×
 // Poder (PvE, o que o cálculo compara: IV, qualidade e potência, no Nv 100, escala log) ou × Nota da Calculadora (0 a 10
 // dentro da espécie, escala linear), escolhido no seletor. As linhas cruzam neste Pokémon: Preço justo e o valor dele.
 // Faixa verde = Vender rápido–Esperar. Nada projetado: só o que vendeu.
 // SEM filtro de nível (decisão de 03/11/2026): entram vendas de todos os níveis da família; o eixo é o PvE ou a nota.
 const SVG='http://www.w3.org/2000/svg';
 const svg=(tag,attrs,text)=>{const e=document.createElementNS(SVG,tag);for(const k in attrs)e.setAttribute(k,attrs[k]);if(text!=null)e.textContent=text;return e;};
 const METRICS={
  nota:{button:'Por nota',axis:'Nota (0 a 10)',of:x=>x.nota,from:3.5,fmt:v=>v.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:2}),up:'nota maior',down:'nota menor',more:'com nota maior',less:'com nota menor'},
  pve:{button:'Por poder',axis:'Poder (PvE)',of:x=>x.pve,from:0,fmt:v=>gems(v),up:'mais forte',down:'mais fraco',more:'mais fortes',less:'mais fracas'}};
 // Gráfico abre em "Por nota" (04/11/2026); sem Nota na ficha, em "Por poder".
 let chartMode='nota',grouped=false;
 function scatter(r,all,m,lo,hi,grouped){
  const who=`${r.family}${r.shiny?' shiny':''}`,mine=m.of(r),known=all.filter(x=>Number.isFinite(m.of(x))),sales=known.filter(x=>m.of(x)>=m.from),hidden=known.length-sales.length;
  if(sales.length<3)return [el('p','small muted',`Poucas vendas de ${who} com ${m.axis.toLowerCase()} para mostrar num gráfico.`)];
  // Eixos (03/11/2026): o eixo horizontal fica colado embaixo, em 0 (Poder) ou 3,5 (Nota): vendas com nota abaixo de
  // 3,5 ficam fora (contadas no texto); sobe até a venda mais alta; o eixo vertical passa no meio, no Preço justo
  // (preço em escala log, mesma distância dos dois lados). A linha amarela tracejada é o valor deste Pokémon, onde cair.
  const prices=sales.map(x=>x.base),lb=Math.log(r.base),devs=prices.map(v=>Math.abs(Math.log(v)-lb)).sort((a,b)=>a-b),dx=1.06*Math.max(.1,devs[Math.floor((devs.length-1)*.98)]||0,Math.abs(Math.log(lo)-lb),Math.abs(Math.log(hi)-lb));
  // O eixo do preço cobre 98% das vendas (centrado no Preço justo): as mais extremas ficam na borda, em círculo vazado.
  const outside=prices.filter(v=>Math.abs(Math.log(v)-lb)>dx).length;
  const vals=[...sales.map(m.of),mine],c0=Math.min(m.from,mine),top=Math.max(...vals),x0=lb-dx,x1=lb+dx,y0=c0,y1=top+(top-c0)*.06||c0+1;
  const W=340,H=222,L=50,R=334,T=10,B=176,X=v=>L+(Math.min(x1,Math.max(x0,Math.log(v)))-x0)/(x1-x0)*(R-L),Y=v=>B-(v-y0)/(y1-y0)*(B-T);
  const chart=svg('svg',{viewBox:`0 0 ${W} ${H}`,class:'scatter'+(sales.length>150?' dense':''),role:'img'}),cx=X(r.base),cy=Y(mine),ay=Y(c0);
  const xl=Math.max(L,X(lo)),xh=Math.min(R,X(hi));
  chart.append(svg('rect',{class:'band',x:xl,y:T,width:Math.max(1,xh-xl),height:B-T}),svg('rect',{class:'frame',x:L,y:T,width:R-L,height:B-T}));
  chart.append(svg('line',{class:'axisline',x1:L,x2:R,y1:ay,y2:ay}),svg('line',{class:'axisline',x1:cx,x2:cx,y1:T,y2:B}));
  // "Agrupar": grade de 24 × 14 quadrados; a cor fica mais forte com mais vendas no quadrado (raiz da contagem) e a
  // cor é verde quando o meio do quadrado está entre Vender rápido e Esperar. Cada quadrado resume as suas vendas.
  if(grouped){const CW=(R-L)/24,CH=(B-T)/14,cells=new Map();
   for(const s of sales){const i=Math.min(23,Math.max(0,Math.floor((X(s.base)-L)/CW))),j=Math.min(13,Math.max(0,Math.floor((B-Y(m.of(s)))/CH))),k=i+':'+j;
    if(!cells.has(k))cells.set(k,{i,j,list:[]});cells.get(k).list.push(s);}
   const most=Math.max(...[...cells.values()].map(c=>c.list.length)),mid=a=>{const v=[...a].sort((x,y)=>x-y);return v[v.length>>1];};
   for(const c of cells.values()){const n=c.list.length,ps=c.list.map(s=>s.base),vs=c.list.map(m.of),price=Math.exp(x0+(c.i+.5)*CW/(R-L)*(x1-x0));
    const cell=svg('rect',{class:'cell'+(price>=lo&&price<=hi?' in':''),x:L+c.i*CW+.5,y:B-(c.j+1)*CH+.5,width:CW-1,height:CH-1,rx:1.5,'fill-opacity':(.2+.8*Math.sqrt(n/most)).toFixed(2)});
    cell.append(svg('title',{},`${n} ${n===1?'venda':'vendas'} · ${gems(Math.min(...ps))} a ${gems(Math.max(...ps))} Gemas (mediana ${gems(mid(ps))}) · ${m.axis} ${m.fmt(Math.min(...vs))} a ${m.fmt(Math.max(...vs))}`));chart.append(cell);}}
  else for(const s of [...sales].sort((a,b)=>a.at-b.at)){const dot=svg('circle',{class:'sale'+(s.base>=lo&&s.base<=hi?' in':'')+(Math.abs(Math.log(s.base)-lb)>dx?' over':''),cx:X(s.base),cy:Y(m.of(s)),r:4});
   dot.append(svg('title',{},`${gems(s.base)} Gemas sem Adicionais · PvE ${gems(s.pve)}${Number.isFinite(s.nota)?' · nota '+METRICS.nota.fmt(s.nota):''} · Nv ${gems(s.level)} · ${when(s.at)}`));chart.append(dot);}
  // Por cima dos pontos: tracejado amarelo = o valor deste Pokémon; o ponto amarelo fica no Preço justo dele.
  chart.append(svg('line',{class:'mine',x1:L,x2:R,y1:cy,y2:cy}));
  const me=svg('circle',{class:'me',cx,cy,r:6});me.append(svg('title',{},`Este Pokémon: ${m.axis} ${m.fmt(mine)} · Preço justo ${gems(r.base)} Gemas`));chart.append(me);
  const ax=B+14,mid=(T+B)/2;
  chart.append(svg('text',{class:'axis',x:L,y:ax},gems(Math.exp(x0))),svg('text',{class:'axis',x:R,y:ax,'text-anchor':'end'},gems(Math.exp(x1))),
   svg('text',{class:'fairlabel',x:cx,y:ax,'text-anchor':'middle'},`Preço justo ${gems(r.base)}`),
   svg('text',{class:'axis',x:L-4,y:T+8,'text-anchor':'end'},m.fmt(y1)),svg('text',{class:'minelabel',x:L-4,y:cy+4,'text-anchor':'end'},m.fmt(mine)),
   svg('text',{class:'axisname',x:(L+R)/2,y:H-4,'text-anchor':'middle'},'Preço (Gemas, sem Adicionais) →'),
   svg('text',{class:'axisname',x:12,y:mid,'text-anchor':'middle',transform:`rotate(-90 12 ${mid})`},m.axis+' →'));
  if(B-cy>=12)chart.append(svg('text',{class:'axis',x:L-4,y:B,'text-anchor':'end'},m.fmt(y0)));
  const above=sales.filter(s=>m.of(s)>mine),cheapAbove=above.filter(s=>s.base<r.base).length,below=sales.filter(s=>m.of(s)<mine),dearBelow=below.filter(s=>s.base>r.base).length;
  const inside=prices.filter(v=>v>=lo&&v<=hi).length;
  chart.setAttribute('aria-label',`${sales.length} vendas de ${who} por preço e ${m.axis}; ${above.length} ${m.more} que este, ${cheapAbove} delas mais baratas que o Preço justo`);
  return [chart,el('p','small',`${grouped?"Cada quadrado junta as vendas da família daquela área (cor mais forte, mais vendas; passe o mouse para ver quantas), de qualquer nível (no preço, as de nível parecido pesam mais)":"Cada ponto é uma venda da família, de qualquer nível (no preço, as de nível parecido pesam mais)"}: mais à direita, mais cara; mais acima, ${m.up}. A linha branca vertical é o Preço justo; a linha amarela marca o valor deste Pokémon (ponto amarelo): os pontos perto dela são parecidos. Das ${sales.length}, ${above.length} eram ${m.more} (${cheapAbove} delas saíram mais baratas que o Preço justo) e ${below.length} ${m.less} (${dearBelow} saíram mais caras). ${inside} ficaram entre Vender rápido e Esperar (faixa verde). Preços sem os Adicionais.${outside?` ${outside} ${outside===1?'venda muito longe do Preço justo aparece':'vendas muito longe do Preço justo aparecem'} na borda, em círculo vazado.`:''}${hidden?` ${hidden} ${hidden===1?"venda":"vendas"} com nota abaixo de 3,5 ${hidden===1?"fica":"ficam"} fora do gráfico.`:""}`)];
 }
 function familyChart(r){
  const all=rows.filter(x=>x.family===r.familyId&&x.shiny===r.shiny),who=`${r.family}${r.shiny?' shiny':''}`;
  if(all.length<3)return null;
  const addons=r.median-r.base,lo=Math.max(1,r.low-addons),hi=Math.max(lo,r.high-addons);
  const box=el('div'),bar=el('div','switch');bar.setAttribute('role','group');bar.setAttribute('aria-label','Eixo vertical do gráfico');
  const buttons={},group=el('button','toggle','Agrupar');group.type='button';group.title='Juntar as vendas em quadrados: a cor mostra quantas há em cada um';
  group.addEventListener('click',()=>{grouped=!grouped;draw(chartMode);});
  const draw=mode=>{chartMode=mode;for(const [k,b]of Object.entries(buttons))b.setAttribute('aria-pressed',String(k===mode));group.setAttribute("aria-pressed",String(grouped));box.replaceChildren(...scatter(r,all,METRICS[mode],lo,hi,grouped));};
  for(const [k,m]of Object.entries(METRICS)){const b=el('button',null,m.button);b.type='button';
   if(k==='nota'&&!Number.isFinite(r.nota)){b.disabled=true;b.title='A ficha colada não tem a Nota da Calculadora';}
   b.addEventListener('click',()=>draw(k));buttons[k]=b;bar.append(b);}
  const tools=el("div","charttools");tools.append(bar,group);
  draw(chartMode==='nota'&&!Number.isFinite(r.nota)?'pve':chartMode);
  const noNota=Number.isFinite(r.nota)?[]:[el('p','small muted','"Por nota" desligado: a ficha colada não tem a linha "Nota da Calculadora".')];
  // Legenda discreta do gráfico: de qual família e de qual tipo de shiny são as vendas (shiny só se compara com shiny).
  // A família são todas as formas que evoluem para a mesma última evolução: o texto diz quais delas têm venda (em ordem
  // de evolução pelo número da espécie; Mega no fim), para não parecer que só a última entra.
  const names=[...new Map(rows.filter(x=>x.family===r.familyId&&x.shiny===r.shiny).sort((a,b)=>a.speciesId-b.speciesId).map(x=>[x.name,1])).keys()];
  const list=names.length>1?`${names.slice(0,-1).join(', ')} e ${names.at(-1)}`:r.family;
  const note=el('p','small muted chartnote');note.append(`Com base nas vendas de ${list} `,el('em',null,r.shiny?'shiny':'não shiny'),` dos últimos 30 dias${names.length>1?` (toda a família ${r.family})`:''}`);
  return [note,tools,...noNota,box];
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
 const REASONS={proximidade:'poucas vendas parecidas com este Pokémon',certeza:'muitas vendas com Adicional incerto',consistencia:'os preços das vendas parecidas variam muito',ampliacao:'poucas vendas da família, completadas com outras espécies'};
 const PART_LABELS={proximidade:'Vendas parecidas (quantas existem)',certeza:'Adicionais confirmados (peso sem Adicional incerto)',consistencia:'Preços que concordam (o quanto as vendas concordam no preço)',ampliacao:'Peso da própria família (quanto vem de vendas da família)'};
// Nome curto da nota que mais pesa na calibração atual (precos.json → confianca.pesos; ordem: proximidade, certeza, consistência, ampliação).
 const topPart=()=>{const w=precos.confianca?.pesos||[],k=Object.keys(PART_LABELS),i=[1,2,3,4].reduce((a,b)=>(w[b]??0)>(w[a]??0)?b:a,1);return PART_LABELS[k[i-1]].replace(/ \(.*$/,'');};
 // Auditoria (fechada), em camadas para o jogador comum: um resumo de 4 linhas, "Como calculamos" e "Quão bem isso
 // funcionou" (os dois fechados). Os números vêm do resultado e de precos.json (teste e confianca).
 const sub=(title,...nodes)=>{const d=el('details','sub');d.append(el('summary',null,title),...nodes);return d;};
 const li=text=>el('li',null,text);
 function confidence(t,r){
  const details=el('details');details.append(el('summary',null,'Como o preço e a confiança são calculados (auditoria)'));
  const fam=r.family,share=Math.round((r.weight||0)*100),c=r.confidence,u=r.uncertain||{};
  const top=el('ul','summary');
  top.append(li(`Preço justo: ${gems(r.median)} Gemas. É o valor do meio das vendas parecidas: metade saiu por menos, metade por mais.`),
   li('Vender rápido e Esperar marcam a faixa normal: metade das vendas parecidas saiu entre os dois.'));
  if(c)top.append(li(`Confiança ${c.percent}%: em vendas como esta, cerca de ${c.percent} em cada 100 costumam sair a até 25% do Preço justo.`));
  top.append(li(share>=50?`Baseado principalmente em ${gems(r.familyCount)} vendas de ${fam}.`:`Poucas vendas de ${fam} (${gems(r.familyCount)}): o cálculo se apoia mais em outras espécies.`));
  details.append(top);
  // Como calculamos.
  const how=[el('h5',null,'Quais vendas entram'),el('p',null,'Só vendas dos últimos 30 dias, e shiny só se compara com shiny (não shiny com não shiny). Cada venda ganha um peso: pesa mais quanto mais parecida for com este Pokémon em Poder, Nota e nível, e quanto mais recente for (uma venda de duas semanas atrás vale metade de uma de hoje). Poder e Nota são os mais exigentes: uma venda com Poder 19% diferente, ou com Nota 0,35 diferente, já vale metade.'),
   el('h5',null,'Primeiro a família, depois as outras espécies'),el('p',null,'As vendas da mesma família (todas as formas que evoluem para o mesmo Pokémon final) são as que mais pesam. Com poucas vendas dela, entram também Pokémon com os mesmos dois tipos, depois com um tipo em comum, depois todos, cada grupo com bem menos peso que o anterior.'),
   el('p',null,`Neste Pokémon, ${share}% do peso do cálculo vem das ${gems(r.familyCount)} vendas de ${fam}; os outros ${100-share}% vêm das demais vendas (${gems(r.marketCount)} no total). É o peso no cálculo, não a quantidade de vendas.`),
   el('h5',null,'Como uma espécie diferente ajuda sem copiar o preço dela'),el('p',null,'Montamos uma referência de quanto o mercado costuma pagar por cada Poder, Nota e nível, com todas as vendas do mesmo tipo (shiny ou não). A Nota é a que mais pesa nela; o nível quase não muda o preço até o Nv 100 (o nível em que o Pokémon vem da hunt) e passa a subir depois. Cada venda é comparada com essa referência: saiu acima ou abaixo do normal para ela? É esse "acima ou abaixo" que entra no cálculo, não o preço.'),
   el('p',null,'Exemplo: se um Garchomp de Poder parecido vendeu 15% acima do normal para ele, isso sugere que o mercado está pagando mais, e puxa este preço um pouco para cima.'),
   el('h5',null,'Os números da tela'),el('p',null,'O Preço justo é o valor do meio dessas vendas, já ajustadas para o Poder, a Nota e o nível deste Pokémon e contando o peso de cada uma. Vender rápido: 25% das vendas parecidas saíram abaixo dele. Esperar: 25% saíram acima.'),
   ...(precos.correcao?.bias?[el('p',null,`Correção: nas vendas dos últimos ${precos.correcao.dias} dias, o cálculo saía em média ${pct(Math.abs(Math.exp(precos.correcao.bias)-1))}% ${precos.correcao.bias>0?'acima':'abaixo'} do valor pago. Esse desvio já vem descontado dos três números.`)]:[]),
   el('h5',null,'Adicionais'),el('p',null,'Cada Adicional conta 10 unidades do item (fragmentos de Z-Move ou AoE, pedras Mega) pelo preço do dia: a mediana das leituras do menor anúncio no mercado naquele dia. O valor é tirado de cada venda antes da comparação e somado de volta no fim, pelo preço de hoje. Mega e Mega Shiny vêm da própria ficha.'),
   el('h5',null,'Vendas com Adicional incerto'),el('p',null,`O jogo mostra o AoE e o Z-Move que o Pokémon tem hoje, não os que tinha na venda. Quando não dá para saber, a venda entra como se eles tivessem sido aplicados depois: o valor deles não é descontado do preço pago, para o cálculo errar para cima e não para baixo. O risco aparece na confiança.${u.family?` Aqui, ${gems(u.family)} das ${gems(r.familyCount)} vendas de ${fam} estão nesse caso.`:''}`),
   el('h5',null,'Pokémon refinados'),el('p',null,'O refino (o "+N" comprado com pedras) não entra no Poder. Vendas de Pokémon refinados entram como se não tivessem refino, com o mesmo peso das outras. O preço pago inclui o refino, o que puxa o cálculo um pouco para cima.')];
  if(c&&r.confidenceParts){
   const parts=el('ul','parts');for(const [k,label]of Object.entries(PART_LABELS)){const item=el('li');item.append(el('span',null,label),el('b',null,String(Math.round(r.confidenceParts[k]*100))));parts.append(item);}
   const avg=Math.round(Object.values(r.confidenceParts).reduce((s,x)=>s+x,0)/4*100);
   how.push(el('h5',null,'De onde vem a confiança'),el('p',null,'Ela junta quatro notas deste Pokémon, de 0 a 100:'),parts,
    el('p',null,`As notas não entram por média simples (que daria ${avg}): cada uma tem um peso aprendido nas vendas recentes, e "${topPart()}" é a que mais pesa. Com esses pesos, as quatro dão ${Math.round(c.chance*100)}%, arredondados para ${c.percent}%. O que mais puxou para baixo: ${REASONS[c.lowest]}.`));
  }
  details.append(sub('Como calculamos',...how));
  // Quão bem isso funcionou.
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
  details.append(sub('Quão bem isso funcionou',...proof));
  return details;
 }

 // Vendas da família que mais pesaram no preço (até 30), com a Proximidade de cada uma (nível, Poder, Nota e data; 100% = idêntica
 // e vendida hoje). Abre pela Proximidade,
 // com 10 linhas e "Mostrar mais". Ordenação pelo cabeçalho: 1º clique do maior para o menor, 2º inverte.
 const share=x=>!Number.isFinite(x)?'–':x>=.001?(x*100).toLocaleString('pt-BR',{maximumFractionDigits:x>=.1?0:1})+'%':'< 0,1%';
 function salesTable(comps){
  const cols=[{key:'closeness',label:'Proximidade'},{key:'level',label:'Nível'},{key:'nota',label:'Nota'},{key:'pve',label:'PvE'},{key:'at',label:'Data'},{key:'price',label:'Gemas'}];
  let sort={key:'closeness',dir:'desc'},open=false;const FIRST=10;
  const table=el('table','sales'),head=el('tr'),body=el('tbody'),more=el('button','toggle');table.append(el('thead'),body);table.tHead.append(head);more.type='button';
  more.addEventListener('click',()=>{open=!open;draw();});
  function draw(){
   const obsHead=el('th','obs','Observação');obsHead.scope='col';
   head.replaceChildren(...cols.map(c=>{const th=el('th');th.scope='col';const b=el('button',null,c.label+(sort.key===c.key?(sort.dir==='asc'?' ↑':' ↓'):''));b.type='button';
    if(sort.key===c.key)th.setAttribute('aria-sort',sort.dir==='asc'?'ascending':'descending');
    if(c.key==='pve')th.title='PvE sem adicionais, no Nv 100 e na última evolução (o mesmo número do jogo)';
    if(c.key==='closeness')th.title='O quanto esta venda se parece com o seu Pokémon em nível, Poder, Nota e data (100% = idêntica e vendida hoje)';
    b.onclick=()=>{sort=sort.key===c.key?{key:c.key,dir:sort.dir==='asc'?'desc':'asc'}:{key:c.key,dir:'desc'};draw();};th.append(b);return th;}),obsHead);
   const sign=sort.dir==='asc'?1:-1,list=[...comps].sort((a,b)=>((a[sort.key]??-1)-(b[sort.key]??-1))*sign||b.at-a.at);
   body.replaceChildren(...list.slice(0,open?list.length:FIRST).map(c=>{
    const tr=el('tr'),price=el('td',null,gems(c.price));
    // Observação numa coluna própria: só o Adicional incerto (o refino é explicado na auditoria, não aqui).
    const obs=el('td','obs'),marks=[];
    if(c.uncertain){const m=el('span','warn','Adicional incerto');m.title='O jogo mostra o AoE e o Z-Move que o Pokémon tem hoje: esta venda foi lida depois e eles podem ter sido aplicados pelo comprador';marks.push(m);}
    marks.forEach((m,i)=>{if(i)obs.append(' · ');obs.append(m);});
    tr.title=`${c.name}${c.shiny?' shiny':''}`;
    tr.append(el('td',null,share(c.closeness)),el('td',null,gems(c.level)),el('td',null,Number.isFinite(c.nota)?METRICS.nota.fmt(c.nota):'–'),el('td',null,Number.isFinite(c.pve)?gems(c.pve):'–'),el('td',null,when(c.at)),price,obs);return tr;}));
   more.hidden=list.length<=FIRST;more.textContent=open?'Mostrar menos':`Mostrar mais (${list.length-FIRST})`;
  }
  draw();const wrap=el('div','tablewrap');wrap.append(table);const box=el('div');box.append(wrap,more);return box;
 }

 // Números da ficha ao lado da sprite, os mesmos dos tooltips do gráfico e da tabela de vendas.
 function sheetStats(r){const bits=[];if(Number.isFinite(r.nota))bits.push('Nota '+METRICS.nota.fmt(r.nota));if(Number.isFinite(r.pve))bits.push('PvE sem adicionais (Nv 100) '+gems(r.pve));
  if(Number.isInteger(r.potencia))bits.push('P'+r.potencia);if(Number.isFinite(r.quality))bits.push('Qualidade '+r.quality.toLocaleString('pt-BR',{maximumFractionDigits:3}));if(r.ivSum)bits.push('IV '+r.ivSum);
  return el('div','sheetstats small',bits.join(' · '));}
 // Preço por nível (04/11/2026): a mesma ficha em outros níveis (priceSheet.byLevel), para o usuário ver quanto ganha
 // upando antes de vender. Nível em escala log; faixa entre Vender rápido e Esperar; o ponto amarelo é o nível atual.
 function levelChart(r){
  // Só o Pokémon (sem Adicionais): é a parte que muda ao upar; os Adicionais somam o mesmo em qualquer nível.
  const add=r.median-r.base,pts=(r.byLevel||[]).map(p=>({...p,low:Math.max(1,p.low-add),median:Math.max(1,p.median-add),high:Math.max(1,p.high-add)}));if(pts.length<3)return [];
  const W=340,H=200,L=52,R=330,T=12,B=160,lx0=Math.log(pts[0].level),lx1=Math.log(pts.at(-1).level),top=Math.max(...pts.map(p=>p.high))*1.05;
  const X=lv=>L+(Math.log(lv)-lx0)/(lx1-lx0||1)*(R-L),Y=v=>B-v/top*(B-T);
  const chart=svg('svg',{viewBox:`0 0 ${W} ${H}`,class:'scatter levels',role:'img'});
  chart.append(svg('rect',{class:'frame',x:L,y:T,width:R-L,height:B-T}));
  chart.append(svg('polygon',{class:'band',points:[...pts.map(p=>`${X(p.level)},${Y(p.high)}`),...[...pts].reverse().map(p=>`${X(p.level)},${Y(p.low)}`)].join(' ')}));
  chart.append(svg('polyline',{class:'line',points:pts.map(p=>`${X(p.level)},${Y(p.median)}`).join(' ')}));
  const now=pts.find(p=>p.current),labels=new Set([pts[0].level,100,1000,pts.at(-1).level].filter(l=>pts.some(p=>p.level===l)&&Math.abs(X(l)-X(now.level))>=28));
  const anchor=lv=>lv===pts[0].level?'start':lv===pts.at(-1).level?'end':'middle';
  for(const p of pts){const dot=svg('circle',{class:p.current?'me':'pt',cx:X(p.level),cy:Y(p.median),r:p.current?6:3.5});dot.append(svg('title',null,`Nv ${gems(p.level)}: Pokémon ${gems(p.median)} Gemas sem Adicionais (${gems(p.low)} a ${gems(p.high)})`));chart.append(dot);
   if(labels.has(p.level)&&!p.current)chart.append(svg('text',{x:X(p.level),y:B+14,'text-anchor':anchor(p.level)},p.drop?`Nv ${gems(p.level)} (hunt)`:gems(p.level)));}
  chart.append(svg('text',{class:'minelabel',x:X(now.level),y:B+14,'text-anchor':anchor(now.level)},'Nv '+gems(now.level)),svg('text',{x:L-6,y:B,'text-anchor':'end'},'0'),svg('text',{x:L-6,y:T+8,'text-anchor':'end'},gems(Math.round(top))));
  chart.append(svg('text',{class:'axisname',x:(L+R)/2,y:H-8,'text-anchor':'middle'},'Nível →'),svg('text',{class:'axisname',x:14,y:(T+B)/2,'text-anchor':'middle',transform:`rotate(-90 14 ${(T+B)/2})`},'Pokémon (Gemas) →'));
  const up=pts.filter(p=>p.level>now.level&&[200,500,1000,2000,5000,10000].includes(p.level)).slice(0,3);
  const nodes=[el('h4',null,'Preço por nível'),chart,el('p','small muted',`Valor do Pokémon sem Adicionais com a mesma ficha em outros níveis, pelo quanto o mercado paga a mais por nível (o mesmo cálculo do Preço justo)${add>0?`; os Adicionais somam ${gems(add)} Gemas em qualquer nível`:''}.${Number.isFinite(r.dropLevel)?` Começa no Nv ${gems(r.dropLevel)}, o nível em que ${r.name} vem da hunt.`:''}${r.dropLevel<100?' Até o Nv 100 o nível quase não muda o preço.':''} A curva é a mesma para todas as espécies: em algumas famílias o nível pesa menos.`)];
  if(up.length)nodes.push(el('p','small',`Se upar antes de vender: ${up.map(p=>`Nv ${gems(p.level)} ≈ ${gems(p.median)} Gemas (+${pct(p.median/now.median-1)}%)`).join(' · ')}.`));
  return nodes;
 }
 // Tópicos embaixo da confiança (04/11/2026): por que a confiança está baixa, de onde vem o preço e o refino.
 // Nível e Nota: média das vendas da família que mais pesaram (ponderada pelo peso), comparada com a deste Pokémon.
 function whyList(r){
  const ul=el('ul','why small'),item=(label,text,cls)=>{const li=el('li',cls);li.append(el('b',null,label+': '),text);ul.append(li);};
  const c=r.confidence;
  if(r.available&&c){if(c.percent<20)item('Confiança baixa','poucas vendas parecidas com este Pokémon. Use o preço só como referência.','warn');
   else if(c.percent<60)item('O que baixou a confiança',`${REASONS[c.lowest]}.`);}
  if(r.available){
   const share=Math.round((r.weight||0)*100),bits=[];
   bits.push(share>=50?`vem principalmente das vendas de ${r.family} (${share}% do peso).`:`há poucas vendas de ${r.family} parecidas com este Pokémon, então ${100-share}% do peso vem de outras espécies, primeiro as com os mesmos tipos.`);
   const comps=(r.comps||[]).filter(x=>x.share>0),W=comps.reduce((t,x)=>t+x.share,0);
   if(W>0){
    const lv=Math.exp(comps.reduce((t,x)=>t+x.share*Math.log(x.level),0)/W),ratio=r.level/lv;
    if(ratio>=1.5||ratio<=1/1.5)bits.push(`As vendas de ${r.family} que mais pesaram são de Nv ${gems(Math.round(lv))} em média e este é Nv ${gems(r.level)}: o preço foi ajustado para ${ratio<1?'baixo':'cima'} pelo nível.`);
    const nn=comps.filter(x=>Number.isFinite(x.nota)),NW=nn.reduce((t,x)=>t+x.share,0);
    const mine=Number.isFinite(r.notaPreco)?r.notaPreco:r.nota;
    if(NW>0&&Number.isFinite(mine)){const nota=nn.reduce((t,x)=>t+x.share*x.nota,0)/NW;
     if(Math.abs(mine-nota)>=.15)bits.push(`Elas têm Nota ${METRICS.nota.fmt(nota)} em média e este tem ${METRICS.nota.fmt(mine)}: o preço foi ajustado para ${mine<nota?'baixo':'cima'} pela Nota.`);}
    if(comps.some(x=>x.price>x.base+1))bits.push(`Na tabela de vendas, as Gemas são o valor pago, com os Adicionais daquela venda; este Pokémon sem Adicionais vale ${gems(r.base)}.`);
   }
   const b=precos.correcao?.bias;if(Math.abs(b||0)>=.02)bits.push(`Já tem uma correção de ${pct(Math.abs(Math.exp(-b)-1))}% para ${b>0?'baixo':'cima'}: na última semana o cálculo vinha saindo ${b>0?'acima':'abaixo'} do valor pago.`);
   item('Preço',bits.join(' '));
  }
  if(r.missing?.length)item('Adicionais sem cotação',`${r.missing.join(', ')} ficou fora do total.`,'warn');
  if(r.refined)item('Refino','não entra no preço: o Pokémon é comparado como se não tivesse refino.');
  return ul;
 }
 function render(r){
  const nodes=[],who=el('div','who'),title=el('div');
  title.append(el('h3',null,`${r.name}${r.shiny?' shiny':''} · Nv ${gems(r.level)}`),types(r.types),sheetStats(r),tags(r));who.append(sprite(r.speciesId,r.shiny,false),title);nodes.push(who);
  if(!r.available)nodes.push(el('p','error','Poucas vendas para comparar este Pokémon.'));
  else{
   const prices=el('div','prices');
   for(const [key,label]of [['low','Vender rápido'],['median','Preço justo'],['high','Esperar']]){const box=el('div','price'+(key==='median'?' main':''));box.append(el('span',null,label),el('b',null,gems(r[key])));prices.append(box);}
   const parts=el('ul','parts'),row=(label,value,cls)=>{const li=el('li',cls);li.append(el('span',null,label),el('b',null,value));parts.append(li);};
   row('Pokémon',gems(r.base)+' Gemas');
   for(const p of r.parts)parts.append(addonRow(p));
   nodes.push(el('p','muted small','Preços em Gemas.'),prices,parts);
   if(r.parts.length)nodes.push(el('p','muted small','Você pode trocar o preço por unidade dos Adicionais: o cálculo usa a cotação do dia, que pode estar defasada.'));
   // Confiança do Preço justo: de 10 em 10; vermelha abaixo de 20% (com aviso), amarela de 20% a 60% (com o que mais
   // pesou para baixo), verde de 60% para cima. O detalhe fica na auditoria.
   if(r.confidence){const c=r.confidence,box=el('div','confidence '+(c.percent<20?'low':c.percent<60?'mid':'high')),bar=el('div','meter'),fill=el('i');
    fill.style.width=c.percent+'%';bar.append(fill);bar.setAttribute('aria-hidden','true');
    box.append(el('b',null,`Confiança ${c.percent}%`),bar);nodes.push(box);}
  }
  const why=whyList(r);if(why.childNodes.length)nodes.push(why);
  // O gráfico da espécie fica sempre à vista; sem vendas suficientes dela, o gráfico geral do teste.
  if(r.available){const chart=familyChart(r);nodes.push(...(chart||(precos.teste?.precificadas?generic(precos.teste,'h4'):[])),...levelChart(r),confidence(precos.teste,r));}
  if(r.comps?.length)nodes.push(el("h4",null,`Vendas de ${r.family} que mais pesaram no preço`),salesTable(r.comps));
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
 function price(event){
  event.preventDefault();
  const text=$('ficha').value;if(!text.trim())return error('Cole o texto do botão "Copiar p/ ChatGPT" da ficha.');
  const sheet=PokeIdleFicha.parse(text);
  if(!sheet.nome)return error('Não encontrei a espécie no texto. Use o botão "Copiar p/ ChatGPT" da ficha e cole o texto inteiro.');
  pricedKey=keyOf(sheet);$('reset').hidden=true;
  // Trava de nota (03/11/2026): abaixo de 3,5 só precifica se a última evolução chegar a 3,5 (Mega não conta).
  const lock=notaLock(sheet);if(lock)return error(lock);
  lastSheet=sheet;compute();
 }
 // Preço por unidade dos Adicionais digitado pelo usuário (itemId → Gemas), guardado neste navegador: vale só para os
 // Adicionais deste Pokémon; as vendas comparadas continuam com o preço do item no dia de cada venda.
 const ITEM_KEY='precificador-adicionais-v1';let lastSheet=null;
 const loadItems=()=>{try{const v=JSON.parse(localStorage.getItem(ITEM_KEY)||'{}');return v&&typeof v==='object'?v:{};}catch{return {};}};
 const saveItems=v=>{try{localStorage.setItem(ITEM_KEY,JSON.stringify(v));}catch{}};
 function setItem(id,unit){const v=loadItems();if(unit>0)v[id]=unit;else delete v[id];saveItems(v);compute();}
 function compute(){
  const sheet=lastSheet;if(!sheet)return;
  // O tipo do Z-Move não muda o preço (o fragmento é o mesmo): vai um tipo qualquer e a linha mostra só "Z-Move".
  try{const r=P.priceSheet(central,{...sheet,nota:notaOf(sheet),tmElemental:$('zmove').checked?'NORMAL':null,tmAoe:$('aoe').checked},{rows,itemPrices:precos.itens,currentItems:loadItems(),now:Date.parse(precos.geradoEm),confidenceWeights:precos.confianca?.pesos,bias:precos.correcao?.bias});
   render({...r,nota:sheet.nota,notaPreco:notaOf(sheet),potencia:sheet.potencia,quality:sheet.quality,ivSum:Object.values(sheet.ivs||{}).reduce((s,v)=>s+v,0),parts:r.parts.map(p=>/^Z-Move/.test(p.label)?{...p,label:'Z-Move'}:p),missing:(r.missing||[]).map(l=>/^Z-Move/.test(l)?'Z-Move':l)});}
  catch(e){error(e.message);}
 }
 // Linha de um Adicional com o preço por unidade editável (Enter ou sair do campo recalcula; "cotação" volta ao do dia).
 function addonRow(p){
  const li=el('li','sub'),label=el('span'),input=el('input','unit');input.type='number';input.min='1';input.step='1';input.inputMode='numeric';
  input.value=p.unit!=null?String(Math.round(p.unit)):'';input.setAttribute('aria-label',`Preço de 1 unidade de ${p.label}, em Gemas`);
  const mine=Number(loadItems()[p.id])>0;input.title=mine?'Seu valor (guardado neste navegador)':`Cotação de ${p.quote!=null?gems(p.quote):'?'} Gemas por unidade`;
  const apply=()=>{const v=Math.round(Number(input.value));if(v>0&&v!==Math.round(p.unit||0))setItem(p.id,v);};
  input.addEventListener('change',apply);input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();apply();}});
  label.append(`${p.label} (${p.quantity} × `,input,')');
  if(mine){const back=el('button','link','cotação');back.type='button';back.title=`Voltar à cotação do dia (${p.quote!=null?gems(p.quote):'?'})`;back.addEventListener('click',()=>setItem(p.id,0));label.append(' ',back);}
  li.append(label,el('b',null,p.total!=null?gems(p.total)+' Gemas':'sem cotação'));return li;
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
