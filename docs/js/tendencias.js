// Página Mercado (mercado.html, pedido de 26/11/2026): para cada cadeia evolutiva, shiny ou normal, as vendas dos últimos
// 30 dias em grupos de 3 dias inteiros (horário de Brasília). Linha cheia: Gemas por venda (média do grupo = Gemas ÷
// vendas), eixo da esquerda. Linha tracejada: vendas por dia (média do grupo), eixo da direita. Linhas suavizadas. As
// vendas no piso dos normais entram (decisão de 26/11/2026). Dentro da cadeia, um seletor mostra uma espécie só. Usa só precos.json.
// Todo texto entra por textContent.
(function(){
 'use strict';
 const DIA=86400000,FUSO=3*3600000,SEMANA=7*DIA,GRUPO=3;
 const SPRITES='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';
 const $=id=>document.getElementById(id);
 const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;};
 const gems=n=>Math.round(n).toLocaleString('pt-BR');
 const SVG='http://www.w3.org/2000/svg';
 const svg=(tag,attrs,text)=>{const e=document.createElementNS(SVG,tag);for(const k in attrs)e.setAttribute(k,attrs[k]);if(text!=null)e.textContent=text;return e;};
 let central=null,vendas=[],fim=0,shiny=true,escolhida=null,especie='';

 function sprite(speciesId,isShiny){
  const id=central.spriteId(speciesId),img=el('img','sprite small');img.alt='';img.loading='lazy';
  img.onerror=()=>img.replaceWith(el('span','nosprite small','?'));
  if(id)img.src=`${SPRITES}${isShiny?'shiny/':''}${id}.png`;else queueMicrotask(img.onerror);
  return img;
 }
 const doGrupo=v=>(v.shiny===true)===shiny&&v.price>0&&v.at>fim-30*DIA&&v.at<=fim;
 const diaDe=at=>Math.floor((at-FUSO)/DIA);

 // Cadeias do grupo, com Gemas/dia e Gemas por venda dos últimos 7 dias, ordenadas por Gemas/dia.
 function cadeias(){
  const m=new Map();
  for(const v of vendas){
   if(!doGrupo(v))continue;
   if(!m.has(v.family))m.set(v.family,{family:v.family,name:v.familyName||v.name,n7:0,gemas7:0,nomes:new Set(),total:0});
   const c=m.get(v.family);c.total++;c.nomes.add(String(v.name||'').toLowerCase());
   if(v.at>fim-SEMANA){c.n7++;c.gemas7+=v.price;}
  }
  return [...m.values()].sort((a,b)=>b.gemas7-a.gemas7||b.total-a.total);
 }
 function lista(){
  const termo=$('busca').value.trim().toLowerCase(),box=$('lista');
  const todas=cadeias(),itens=todas.filter(c=>!termo||String(c.name).toLowerCase().includes(termo)||[...c.nomes].some(n=>n.includes(termo)));
  $('status').textContent=`${todas.length} cadeias ${shiny?'shiny':'não shiny'} com vendas nos últimos 30 dias, ordenadas por Gemas/dia na última semana.`;
  if(!itens.length){box.replaceChildren(el('p','muted small','Nenhuma cadeia com esse nome.'));return;}
  const t=el('table','mkt'),head=el('tr');
  for(const [txt,cls]of [['Cadeia',''],['Gemas/dia','num'],['Por venda','num']])head.append(el('th',cls||null,txt));
  const thead=el('thead');thead.append(head);const tbody=el('tbody');t.append(thead,tbody);
  for(const c of itens){
   const tr=el('tr','pick'+(escolhida===c.family?' on':'')),td=el('td'),b=el('button','linkrow');b.type='button';
   const quem=el('span','mktwho');quem.append(sprite(c.family,shiny),el('span',null,c.name));b.append(quem);
   b.addEventListener('click',()=>{escolhida=c.family;especie='';marcar();desenhar();});
   td.append(b);tr.append(td,el('td','num',c.n7?gems(c.gemas7/7):'–'),el('td','num',c.n7?gems(c.gemas7/c.n7):'–'));tbody.append(tr);
  }
  box.replaceChildren(t);
 }
 // Série diária da cadeia escolhida (ou de uma espécie dela): {dia, n, gemas}.
 function serie(){
  // Só dias inteiros: o dia da leitura (até 06:30, mais ou menos) fica de fora, para não parecer uma queda.
  // Grupos de 3 dias contados a partir do último dia inteiro; um grupo incompleto no começo fica de fora.
  const d1=diaDe(fim)-1,grupos=Math.floor((d1-diaDe(fim-30*DIA))/GRUPO),dias=new Map();
  for(let g=grupos-1;g>=0;g--){const ate=d1-g*GRUPO;dias.set(g,{de:ate-GRUPO+1,ate,n:0,gemas:0});}
  const especies=new Map();
  for(const v of vendas){
   if(!doGrupo(v)||v.family!==escolhida)continue;
   if(!especies.has(v.speciesId))especies.set(v.speciesId,{id:v.speciesId,name:v.name,n:0});especies.get(v.speciesId).n++;
   if(especie&&String(v.speciesId)!==especie)continue;
   const s=dias.get(Math.floor((d1-diaDe(v.at))/GRUPO));if(s){s.n++;s.gemas+=v.price;}
  }
  return {pontos:[...dias.values()],especies:[...especies.values()].sort((a,b)=>b.n-a.n)};
 }
 const rotuloDia=d=>new Date(d*DIA+FUSO).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit'});
 const rotulo=p=>`${rotuloDia(p.de)} a ${rotuloDia(p.ate)}`;
 // Curva suave que passa pelos pontos sem inventar picos (cúbica monótona, Fritsch–Carlson). pts: [[x, y], ...].
 function curva(pts){
  if(pts.length<2)return pts.length?`M${pts[0][0]},${pts[0][1]}`:'';
  const n=pts.length,dx=[],m=[],t=[];
  for(let i=0;i<n-1;i++){dx[i]=pts[i+1][0]-pts[i][0];m[i]=(pts[i+1][1]-pts[i][1])/dx[i];}
  t[0]=m[0];t[n-1]=m[n-2];
  for(let i=1;i<n-1;i++)t[i]=m[i-1]*m[i]<=0?0:3*(dx[i-1]+dx[i])/((2*dx[i]+dx[i-1])/m[i-1]+(dx[i]+2*dx[i-1])/m[i]);
  let d=`M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for(let i=0;i<n-1;i++){const h=dx[i]/3;d+=`C${(pts[i][0]+h).toFixed(1)},${(pts[i][1]+h*t[i]).toFixed(1)} ${(pts[i+1][0]-h).toFixed(1)},${(pts[i+1][1]-h*t[i+1]).toFixed(1)} ${pts[i+1][0].toFixed(1)},${pts[i+1][1].toFixed(1)}`;}
  return d;
 }
 // Escala "bonita" de 0 até um pouco acima do máximo.
 // Topo do eixo com 4 divisões redondas: o passo é 1, 2, 2,5 ou 5 × potência de 10 (inteiro para contagens).
 function topo(max,inteiro){if(!(max>0))return 4;const bruto=max/4,p=10**Math.floor(Math.log10(bruto)),f=bruto/p;let passo=(f<=1?1:f<=2?2:f<=2.5?2.5:f<=5?5:10)*p;if(inteiro)passo=Math.max(1,Math.ceil(passo));return passo*4;}
 function grafico(pontos){
  const W=760,H=340,L=70,R=690,T=20,B=290;
  const porDia=p=>p.n/GRUPO,maxMedia=topo(Math.max(...pontos.map(p=>p.n?p.gemas/p.n:0))),maxN=topo(Math.max(...pontos.map(porDia)),true);
  const X=i=>L+(pontos.length<2?0:i/(pontos.length-1))*(R-L),Y1=v=>B-v/maxMedia*(B-T),Y2=v=>B-v/maxN*(B-T);
  const s=svg('svg',{viewBox:`0 0 ${W} ${H}`,class:'trendchart',role:'img','aria-label':'Gemas por venda e vendas por dia, de 3 em 3 dias'});
  for(let k=0;k<=4;k++){
   const y=B-k/4*(B-T);s.append(svg('line',{x1:L,x2:R,y1:y,y2:y,class:'grid'}));
   s.append(svg('text',{x:L-8,y:y+4,'text-anchor':'end',class:'axis left'},gems(maxMedia*k/4)));
   s.append(svg('text',{x:R+8,y:y+4,'text-anchor':'start',class:'axis right'},gems(maxN*k/4)));
  }
  pontos.forEach((p,i)=>{if(i%2===0||i===pontos.length-1)s.append(svg('text',{x:X(i),y:B+18,'text-anchor':'middle',class:'axis'},rotuloDia(p.ate)));});
  // Gemas por venda: só nos grupos com venda; um grupo sem venda interrompe a linha.
  const trechos=[[]];pontos.forEach((p,i)=>{if(p.n)trechos.at(-1).push([X(i),Y1(p.gemas/p.n)]);else if(trechos.at(-1).length)trechos.push([]);});
  s.append(svg('path',{d:trechos.filter(t=>t.length).map(curva).join(' '),class:'serie media'}));
  pontos.forEach((p,i)=>{if(p.n){const c=svg('circle',{cx:X(i),cy:Y1(p.gemas/p.n),r:3.5,class:'ponto media'});c.append(svg('title',{},`${rotulo(p)}: ${gems(p.gemas/p.n)} Gemas por venda, ${p.n} venda${p.n>1?'s':''}`));s.append(c);}});
  s.append(svg('path',{d:curva(pontos.map((p,i)=>[X(i),Y2(porDia(p))])),class:'serie qtd'}));
  pontos.forEach((p,i)=>{const c=svg('circle',{cx:X(i),cy:Y2(porDia(p)),r:3,class:'ponto qtd'});c.append(svg('title',{},`${rotulo(p)}: ${p.n} venda${p.n===1?'':'s'} (${gems(porDia(p))} por dia)`));s.append(c);});
  return s;
 }
 function desenhar(){
  const painel=$('painel');
  if(escolhida==null){painel.replaceChildren(el('h2',null,'Escolha uma cadeia'),el('p','muted','Clique numa cadeia da lista para ver o gráfico dela.'));return;}
  const {pontos,especies}=serie(),c=cadeias().find(x=>x.family===escolhida);
  const titulo=el('div','mktwho trendtitle');titulo.append(sprite(escolhida,shiny),el('h2',null,`${c?.name||especies[0]?.name||'Cadeia'}${shiny?' shiny':''}`));
  const nodes=[titulo];
  if(!especies.length){nodes.push(el('p','muted','Nenhuma venda desta cadeia neste grupo nos últimos 30 dias.'));painel.replaceChildren(...nodes);return;}
  const sel=el('select');sel.id='especie';sel.append(new Option('Cadeia toda',''));
  for(const e of especies)sel.append(new Option(`${e.name} (${e.n} venda${e.n===1?'':'s'})`,String(e.id)));
  sel.value=especie;sel.addEventListener('change',()=>{especie=sel.value;desenhar();});
  const lab=el('label',null,'Espécie');lab.htmlFor='especie';const linha=el('div','trendsel');linha.append(lab,sel);nodes.push(linha);
  const total=pontos.reduce((s,p)=>s+p.n,0),gemasT=pontos.reduce((s,p)=>s+p.gemas,0);
  nodes.push(el('p','muted small',`${total} vendas em ${pontos.length*GRUPO} dias, ${gems(gemasT/Math.max(1,total))} Gemas por venda em média. Cada ponto junta 3 dias.`));
  const legenda=el('ul','legend chartkey');
  for(const [cls,txt]of [['media','Gemas por venda'],['qtd','Vendas por dia']]){const li=el('li');li.append(el('i','swatch '+cls),txt);legenda.append(li);}
  nodes.push(legenda,grafico(pontos));
  painel.replaceChildren(...nodes);
 }
 function marcar(){
  $('gshiny').setAttribute('aria-pressed',String(shiny));$('gnormal').setAttribute('aria-pressed',String(!shiny));
  try{history.replaceState(null,'',location.pathname+(escolhida!=null?`#c=${escolhida}&s=${shiny?1:0}`:''));}catch{}
  lista();
 }
 function lerLink(){
  const h=new URLSearchParams(location.hash.slice(1)),c=Number(h.get('c'));
  if(Number.isInteger(c)&&c>0){escolhida=c;shiny=h.get('s')!=='0';}
 }
 async function start(){
  for(const [id,valor]of [['gshiny',true],['gnormal',false]])$(id).addEventListener('click',()=>{if(shiny===valor)return;shiny=valor;especie='';marcar();desenhar();});
  $('busca').addEventListener('input',lista);
  try{
   const r=await fetch('precos.json',{cache:'no-cache'});if(!r.ok)throw Error(r.status);
   const precos=await r.json();vendas=PokeIdleCentral.vendas(precos);fim=Date.parse(precos.geradoEm);central=PokeIdleCentral.create(window);
   lerLink();marcar();desenhar();
  }catch(e){$('status').textContent='Não foi possível carregar as vendas. Recarregue a página.';$('status').classList.add('warn');}
 }
 start();
})();
