// Mercado na página principal (pedido de 26/11/2026). Sem ficha: o mercado shiny e o normal, em Gemas por dia e Gemas
// por venda (média: total ÷ quantidade) nos últimos 7 dias, com a variação contra os 7 anteriores. Com ficha: também a
// cadeia evolutiva do Pokémon colado (no grupo dele, shiny ou normal). As tendências de cada cadeia ficam na página
// mercado.html. Usa as vendas que a página já leu (precos.json); nada novo é publicado. Todo texto entra por textContent.
(function(){
 'use strict';
 const DIA=86400000,SEMANA=7*DIA,MIN_VENDAS=5;
 const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;};
 const gems=n=>Math.round(n).toLocaleString('pt-BR');
 // Semana atual (a) e anterior (b) de um grupo: {n, gemas}.
 function semanas(vendas,fim,filtro){
  const a={n:0,gemas:0},b={n:0,gemas:0};
  for(const v of vendas){
   if(!(v.at>fim-2*SEMANA&&v.at<=fim)||!(v.price>0)||!filtro(v))continue;
   const lado=v.at>fim-SEMANA?a:b;lado.n++;lado.gemas+=v.price;
  }
  return {a,b};
 }
 // Variação contra a semana anterior; sem vendas suficientes nas duas, nada (um número de poucas vendas engana).
 function variacao(a,b,valor){
  if(a.n<MIN_VENDAS||b.n<MIN_VENDAS)return null;
  const va=valor(a),vb=valor(b);return vb>0?va/vb-1:null;
 }
 const porDia=s=>s.gemas/7,porVenda=s=>s.n?s.gemas/s.n:0;
 function textoVariacao(v){
  if(v==null)return {texto:'–',cls:'muted',titulo:`Menos de ${MIN_VENDAS} vendas numa das semanas`};
  const p=Math.round(v*100);
  return {texto:(p>0?'+':p<0?'−':'')+Math.abs(p)+'%',cls:p>=5?'up':p<=-5?'down':'flat',titulo:''};
 }
 function numero(valor,rotulo,v){
  const box=el('span','mktnum');box.append(el('b',null,gems(valor)),el('span','muted small',' '+rotulo));
  const t=textoVariacao(v),s=el('span','mktvar '+t.cls,t.texto);if(t.titulo)s.title=t.titulo;box.append(s);
  return box;
 }
 function cartao(titulo,g,link){
  const box=el('div','mktsum');box.append(el('span','mktlabel',titulo));
  box.append(numero(porDia(g.a),'Gemas/dia',variacao(g.a,g.b,porDia)),el('span','mktsep','·'),numero(porVenda(g.a),'Gemas por venda',variacao(g.a,g.b,porVenda)));
  if(link)box.append(link);
  return box;
 }
 function linkTendencias(texto,hash){
  const a=el('a','mktlink',texto);a.href='mercado.html'+(hash||'');return a;
 }
 let alvo=null,vendas=null,fim=0,cadeiaAtual=null;
 function desenhar(){
  if(!alvo)return;
  const cards=el('div','mktsums');
  cards.append(cartao('Shiny',semanas(vendas,fim,v=>v.shiny===true)),cartao('Não shiny',semanas(vendas,fim,v=>v.shiny!==true)));
  const nodes=[el('h2',null,'Mercado'),el('p','muted small','Últimos 7 dias, com a variação contra os 7 dias anteriores. Gemas por venda = Gemas vendidas ÷ quantidade de vendas.'),cards];
  if(cadeiaAtual){
   const c=cadeiaAtual,g=semanas(vendas,fim,v=>v.family===c.family&&(v.shiny===true)===c.shiny);
   const titulo=`Cadeia ${c.name}${c.shiny?' shiny':''}`;
   const box=el('div','mktsums');
   box.append(g.a.n||g.b.n?cartao(titulo,g,linkTendencias('Ver gráfico',`#c=${c.family}&s=${c.shiny?1:0}`)):el('p','muted small',`${titulo}: nenhuma venda nos últimos 14 dias.`));
   nodes.push(box);
  }
  const rodape=el('p','mktfoot');rodape.append(linkTendencias('Tendências de todas as cadeias'));nodes.push(rodape);
  alvo.replaceChildren(...nodes);alvo.hidden=false;
 }
 // secao: a seção; lista: vendas de precos.json (PokeIdleCentral.vendas); horario: leitura (geradoEm).
 function render(secao,lista,horario){
  if(!secao||!Array.isArray(lista)||!(horario>0))return;
  alvo=secao;vendas=lista;fim=horario;desenhar();
 }
 // O Pokémon colado (resultado do preço): mostra a cadeia dele; null tira.
 function cadeia(r){
  const nova=r&&r.familyId!=null?{family:r.familyId,shiny:r.shiny===true,name:(typeof r.family==='string'?r.family:null)||r.name||'?'}:null;
  if(JSON.stringify(nova)===JSON.stringify(cadeiaAtual))return;
  cadeiaAtual=nova;desenhar();
 }
 window.PokeIdleMercado={render,cadeia,semanas,variacao};
})();
