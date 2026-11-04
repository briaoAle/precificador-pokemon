// Texto do botão "Copiar p/ ChatGPT" da ficha → {nome, level, potencia, quality, nota, shiny, ivs, refinoActual}.
// Formato visto em 03/11/2026: Markdown com "- Espécie: Tyranitar (#248) — ROCK / DARK", números com vírgula de
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
  const field=name=>{const re=new RegExp('^\\s*[-*]?\\s*'+name+'\\s*:\\s*(.+)$','i');for(const l of lines){const m=l.match(re);if(m)return m[1].trim();}return null;};
  const species=field('esp[ée]cie');
  const nome=species?species.replace(/\s*\(#\d+\).*$/,'').replace(/\s+[—–-]\s+[A-Z /]+$/,'').replace(/✨/g,'').trim()||null:null;
  const shiny=/^(sim|yes|true)\b/i.test(field('shiny')||'');
  const potencia=integer(field('pot[êe]ncia'));
  // Tabela de stats: as colunas são achadas pelo cabeçalho; o refino pode vir numa coluna própria ou como "+N" na base.
  const ivs={},refinoActual={};let cols=null;
  for(const l of lines){
   if(!l.trim().startsWith('|'))continue;
   const row=cells(l);
   if(/^stat$/i.test(row[0])){cols={base:row.findIndex(c=>/^base/i.test(c)),iv:row.findIndex(c=>/^iv\b/i.test(c)),refino:row.findIndex(c=>/refino/i.test(c))};continue;}
   const key=STATS[row[0].toUpperCase().replace(/[^A-Z]/g,'')];
   if(!cols||!key||cols.iv<0)continue;
   const iv=integer(row[cols.iv]);if(Number.isInteger(iv))ivs[key]=iv;
   const refino=cols.refino>=0?integer(row[cols.refino]):integer(String(row[cols.base]??'').match(/\+\s*([\d.,]+)/)?.[1]);
   if(refino>0)refinoActual[key]=refino;
  }
  // "Nota da Calculadora: 3.575 de 10 (Razoável)": entra no preço e no gráfico "Por nota" (sem ela, o preço usa a calculada).
  return {nome,level:integer(field('n[íi]vel')),potencia,quality:decimal(field('qualidade')),nota:decimal(field('nota(?: da calculadora)?')),shiny,ivs,refinoActual};
 }
 const api={parse};
 if(typeof module==='object'&&module.exports)module.exports=api;else root.PokeIdleFicha=api;
})(typeof window==='object'?window:globalThis);
