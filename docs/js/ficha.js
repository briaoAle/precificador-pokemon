// Texto do botão "Copiar p/ ChatGPT" da ficha → {nome, level, potencia, quality, nota, shiny, ivs, refinoActual}.
// Aceita também o texto do jogo em inglês (Species, Level, Potency, Quality, Calculator Score). Formato visto em 03/11/2026: Markdown com "- Espécie: Tyranitar (#248) — ROCK / DARK", números com vírgula de
// milhar ("Nível: 1,044") e ponto decimal ("Qualidade: 1.8"), "Potência: P1" e os IVs numa tabela
// "| Stat | Base da espécie | IV (1–32) | ... |". Os Adicionais não vêm no texto: chegam pelos controles da página.
(function(root){
 'use strict';
 const STATS={HP:'hp',ATK:'atk',DEF:'def',SPATK:'spAtk',SPDEF:'spDef',SPD:'speed',SPEED:'speed',SPE:'speed'};
 const integer=s=>{const m=String(s??'').match(/\d[\d.,]*/);return m?Number(m[0].replace(/[.,]/g,'')):null;};
 const decimal=s=>{const m=String(s??'').match(/\d+(?:[.,]\d+)?/);return m?Number(m[0].replace(',','.')):null;};
 const cells=line=>line.trim().replace(/^\|/,'').replace(/\|$/,'').split('|').map(c=>c.trim());
 function parse(text){
  const lines=String(text||'').split(/\r?\n/);
  // "- Campo: valor" da seção "O pokemon".
  const field=name=>{const re=new RegExp('^\\s*[-*]?\\s*(?:'+name+')\\s*:\\s*(.+)$','i');for(const l of lines){const m=l.match(re);if(m)return m[1].trim();}return null;};
  const species=field('esp[ée]cie|species');
  const nome=species?species.replace(/\s*\(#\d+\).*$/,'').replace(/\s+[—–-]\s+[A-Z /]+$/,'').replace(/✨/g,'').trim()||null:null;
  const shiny=/^(sim|yes|true)\b/i.test(field('shiny')||'');
  const potencia=integer(field('pot[êe]ncia|potency'));
  // Tabela de stats: as colunas são achadas pelo cabeçalho; o refino pode vir numa coluna própria ou como "+N" na base.
  const ivs={},refinoActual={};let cols=null;
  for(const l of lines){
   if(!l.trim().startsWith('|'))continue;
   const row=cells(l);
   if(/^stat$/i.test(row[0])){cols={base:row.findIndex(c=>/^(?:species )?base/i.test(c)),iv:row.findIndex(c=>/^iv\b/i.test(c)),refino:row.findIndex(c=>/refino|refine/i.test(c))};continue;}
   const key=STATS[row[0].toUpperCase().replace(/[^A-Z]/g,'')];
   if(!cols||!key||cols.iv<0)continue;
   const iv=integer(row[cols.iv]);if(Number.isInteger(iv))ivs[key]=iv;
   const refino=cols.refino>=0?integer(row[cols.refino]):integer(String(row[cols.base]??'').match(/\+\s*([\d.,]+)/)?.[1]);
   if(refino>0)refinoActual[key]=refino;
  }
  // "Nota da Calculadora: 3.575 de 10 (Razoável)": entra no preço e no gráfico "Por nota" (sem ela, o preço usa a calculada).
  return {nome,level:integer(field('n[íi]vel|level')),potencia,quality:decimal(field('qualidade|quality')),nota:decimal(field('nota(?: da calculadora)?|calculator score')),shiny,ivs,refinoActual};
 }
 // Link para abrir a página com a ficha preenchida: só a espécie e os números do cálculo, depois do "#", que o
 // navegador não envia a nenhum servidor. fromLink refaz o texto no formato de parse e a página segue o caminho normal.
 const ORDER=[['hp','HP'],['atk','ATK'],['def','DEF'],['spAtk','SP.ATK'],['spDef','SP.DEF'],['speed','SPD']];
 function toLink(sheet,{zMove=false,aoe=false}={}){
  const p=new URLSearchParams({nome:sheet.nome,nv:sheet.level,p:sheet.potencia,q:sheet.quality});
  if(Number.isFinite(sheet.nota))p.set('n',sheet.nota);
  if(sheet.shiny)p.set('s','1');
  p.set('iv',ORDER.map(([k])=>sheet.ivs?.[k]??'').join('-'));
  if(ORDER.some(([k])=>sheet.refinoActual?.[k]>0))p.set('r',ORDER.map(([k])=>sheet.refinoActual?.[k]||0).join('-'));
  if(zMove)p.set('z','1');
  if(aoe)p.set('a','1');
  return p.toString();
 }
 function fromLink(hash){
  const p=new URLSearchParams(String(hash||'').replace(/^#/,'')),nome=(p.get('nome')||'').replace(/[\u0000-\u001f|]/g,' ').trim().slice(0,60);
  if(!nome)return null;
  const num=k=>{const m=(p.get(k)||'').match(/^\d{1,7}(?:\.\d{1,20})?$/);return m?m[0]:'';},list=k=>(p.get(k)||'').split('-'),int=v=>/^\d{1,7}$/.test(v||'')?v:'';
  const ivs=list('iv'),refino=list('r'),potencia=/^[1-5]$/.test(p.get('p')||'')?p.get('p'):'',quality=Number(num('q'))>=.8&&Number(num('q'))<=1.8?num('q'):'';
  const text=[`- Espécie: ${nome}`,`- Shiny: ${p.get('s')==='1'?'sim':'não'}`,`- Nível: ${int(p.get('nv'))}`,`- Potência: P${potencia}`,`- Qualidade: ${quality}`,
   ...(num('n')?[`- Nota da Calculadora: ${num('n')}`]:[]),'','| Stat | Base | IV |',
   ...ORDER.map(([,label],i)=>`| ${label} | ${int(refino[i])>0?'+'+int(refino[i]):''} | ${int(ivs[i])} |`)].join('\n');
  return {text,zMove:p.get('z')==='1',aoe:p.get('a')==='1'};
 }
 const api={parse,toLink,fromLink};
 if(typeof module==='object'&&module.exports)module.exports=api;else root.PokeIdleFicha=api;
})(typeof window==='object'?window:globalThis);
