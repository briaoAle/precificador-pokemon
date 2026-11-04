// Novidades do site: o botão no cabeçalho abre uma janela com o que mudou, da mais recente para a mais antiga.
// Para uma nova versão, acrescente uma entrada no começo de NOVIDADES (data e itens em texto simples).
(function(){
 'use strict';
 const NOVIDADES=[
  {data:'04/11/2026, 11h46',itens:[
   'Novo layout: a ficha e o preço lado a lado, e embaixo os dois gráficos lado a lado, a tabela de vendas e, por último, a auditoria.',
   'Embaixo da confiança, "Por que a confiança é baixa" lista cada motivo numa linha, e "Como chegamos ao preço" compara este Pokémon com as vendas mais parecidas.',
   'Os motivos da confiança dizem quantas vendas comparáveis existem de fato: a família pode ter muitas vendas e quase nenhuma parecida em Poder e Nota.',
   'Quando quase todo o preço vem de outras espécies, a tabela de vendas da família avisa.',
   'No gráfico de vendas, a linha amarela é a Nota ou o Poder deste Pokémon, conforme o eixo escolhido.']},
  {data:'04/11/2026, 11h04',itens:[
   'Botão "Novidades" no topo da página, com o que mudou em cada versão do site.']},
  {data:'04/11/2026, 10h28',itens:[
   'O preço passa a usar a Nota junto com o Poder e o nível, e as vendas com Nota parecida pesam mais. No teste com vendas passadas, 35 em cada 100 saíram a até 25% do Preço justo (eram 33).',
   'Novo gráfico "Preço por nível": quanto o mesmo Pokémon valeria em outros níveis, a partir do nível em que ele vem da hunt. Ajuda a decidir se vale upar antes de vender.',
   'Embaixo da confiança, tópicos explicam o que baixou a confiança e comparam este Pokémon com as vendas que mais pesaram: quanto elas pagaram em média, sem Adicionais, e com qual nível e Nota.',
   'O gráfico de vendas abre em "Por nota" e diz quais formas da família entraram no cálculo (por exemplo, Larvitar, Pupitar e Tyranitar).',
   'Na tabela de vendas, a coluna Observação mostra só o Adicional incerto, e o título da coluna Gemas explica que é o valor pago, com os Adicionais da venda.']},
  {data:'04/11/2026, 0h12',itens:[
   'Vendas com Adicional incerto entram sem desconto, para o preço errar para cima e não para baixo. O risco aparece na confiança.',
   'Pokémon refinados entram no cálculo sem o refino e com peso cheio.',
   'Dá para trocar o preço por unidade dos Adicionais quando a cotação do dia estiver defasada. O valor fica guardado só neste navegador, e um botão volta à cotação do dia.',
   'Tabela de vendas com a coluna Observação e o "PvE sem adicionais (Nv 100)" ao lado da sprite.']},
  {data:'03/11/2026',itens:[
   'Preço pelas vendas mais parecidas com o seu Pokémon, com a confiança do resultado e uma auditoria de como foi calculado.',
   'Gráfico com as vendas da família e mais vendas no histórico.',
   'Tipos com cor, etiquetas dos Adicionais e gráficos de quão bem o cálculo acertou vendas passadas.',
   'Primeira versão do site.']},
 ];
 const SVG='http://www.w3.org/2000/svg';
 const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;};
 function icon(){
  // Pergaminho com linhas: desenhado aqui, sem imagem externa.
  const s=document.createElementNS(SVG,'svg');s.setAttribute('viewBox','0 0 24 24');s.setAttribute('aria-hidden','true');s.setAttribute('class','newsicon');
  for(const d of ['M6 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z','M8 8h8','M8 12h8','M8 16h5']){const p=document.createElementNS(SVG,'path');p.setAttribute('d',d);s.append(p);}
  return s;
 }
 function build(){
  const header=document.querySelector('header.top');if(!header)return;
  const button=el('button','newsbtn');button.type='button';button.append(icon(),el('span',null,'Novidades'));button.setAttribute('aria-haspopup','dialog');
  const dialog=el('dialog','news'),head=el('div','newshead'),close=el('button','newsclose','Fechar');close.type='button';
  dialog.setAttribute('aria-labelledby','news-title');const title=el('h2',null,'Novidades');title.id='news-title';head.append(title,close);dialog.append(head);
  for(const v of NOVIDADES){const list=el('ul');for(const t of v.itens)list.append(el('li',null,t));dialog.append(el('h3',null,v.data),list);}
  button.addEventListener('click',()=>dialog.showModal());
  close.addEventListener('click',()=>dialog.close());
  // Clique fora da janela (no fundo escurecido) também fecha.
  dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
  dialog.addEventListener('close',()=>button.focus());
  header.append(button);document.body.append(dialog);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build);else build();
})();
