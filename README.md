# Precificador de Pokémon

Estima o preço de venda, em Gemas, de um Pokémon do [PokeIdle](https://pokeidle.io). Você cola o texto do botão
**Copiar p/ ChatGPT** da ficha do Pokémon e vê três preços: **Vender rápido**, **Preço justo** e **Esperar**.

**Projeto independente, sem relação com os criadores do PokeIdle.**

## Como usar

1. No jogo, abra a ficha do Pokémon e clique em **Copiar p/ ChatGPT**.
2. Cole o texto na página.
3. Marque o Z-Move e o AoE, se ele tiver: eles não vêm no texto. Mega e Mega Shiny vêm da própria ficha.
4. Clique em **Precificar**.

O texto colado é lido só no seu navegador: nada é enviado a nenhum servidor, e a página não acessa o jogo nem a
conta de ninguém.

## De onde vêm os preços

- `docs/precos.json` tem as vendas de Pokémon em Gemas dos últimos 30 dias, lidas do histórico público do mercado
  do jogo. O arquivo não tem vendedor, comprador, nick nem id de venda ou de anúncio, e o horário de cada venda é
  arredondado para o minuto.
- Cada Adicional (Z-Move, AoE, Mega) conta 10 unidades do item (fragmentos ou pedras). O preço do item num dia é a
  mediana das leituras do menor preço anunciado no mercado naquele dia. O Pokémon precificado leva os Adicionais pelo
  preço mais recente; de cada venda passada, eles são descontados pelo preço do dia da venda. O que sobra
  é comparado pelo **PvE da última evolução no Nv 100**: uma curva de todo o mercado (separada por shiny e por nível
  parecido) misturada com as vendas da mesma família, que pesam mais quanto mais vendas houver.
- Vender rápido, Preço justo e Esperar são o 1º quartil, a mediana e o 3º quartil.
- O refino não entra no preço.

## Quão confiável é

O mercado é feito por pessoas e não segue uma regra fixa: o preço serve para orientar, não para garantir. A página
mostra, perto do preço, o resultado do teste contra vendas passadas, refeito a cada atualização: cada venda é
precificada só com as vendas anteriores a ela e comparada com o preço pago. Em 03/11/2026: 43% das vendas ficaram
entre Vender rápido e Esperar, e o erro mediano foi de 3 vezes para mais ou para menos.

## Atualização

Os preços são atualizados de tempos em tempos com um novo `docs/precos.json`. A página mostra quando as vendas
foram lidas.

## Arquivos

- `docs/index.html`, `docs/app.css`, `docs/js/`: a página.
- `docs/motor/`: o cálculo do preço.
- `docs/catalogo/`: espécies (status base, tipos, golpes e evoluções) e a fórmula de PvE do jogo.
- Sprites da [PokeAPI](https://github.com/PokeAPI/sprites).

## Licença

[MIT](LICENSE).
