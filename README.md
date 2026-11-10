# Precificador de Pokémon

Estima o preço de venda, em Gemas, de um Pokémon do [PokeIdle](https://pokeidle.io). Você cola o texto do botão
**Copiar p/ ChatGPT** da ficha do Pokémon e vê três preços: **Vender rápido**, **Preço justo** e **Esperar**, com a
confiança do resultado e as vendas usadas na conta.

**Projeto independente, sem relação com os criadores do PokeIdle.**

## Como usar

1. No jogo, abra a ficha do Pokémon e clique em **Copiar p/ ChatGPT**. A ficha em inglês também funciona.
2. Cole o texto na página.
3. Marque o Z-Move e o AoE, se ele tiver: eles não vêm no texto. Mega e Mega Shiny vêm da própria ficha.
4. Clique em **Precificar**.

O texto colado é lido só no seu navegador: nada é enviado a nenhum servidor, e a página não acessa o jogo nem a
conta de ninguém.

## De onde vêm os preços

`docs/precos.json` tem as vendas de Pokémon em Gemas dos últimos 30 dias, lidas do histórico público do mercado do
jogo. O arquivo não tem vendedor, comprador, nick nem id de venda ou de anúncio, e o horário de cada venda é
arredondado para o minuto.

O cálculo segue estes passos:

1. **Adicionais:** cada um (Z-Move, AoE, Mega) conta 10 unidades do item, fragmentos ou pedras, pela mediana do menor
   anúncio do dia. O valor sai de cada venda passada pelo preço daquele dia e volta no fim, pelo preço mais recente.
2. **Curva do mercado:** as vendas do mesmo tipo, shiny ou não, formam uma curva de quanto o mercado paga por Poder no
   PvE da última evolução no Nv 100, Nota da Calculadora e nível. A Nota é a que mais pesa.
3. **Vendas parecidas:** de cada venda entra só o quanto ela saiu acima ou abaixo da curva. Pesam mais as de PvE, Nota
   e nível parecidos, as mais recentes e as da mesma cadeia evolutiva. Outras espécies completam a conta, com bem menos
   peso.
4. **Três preços:** o Preço justo é a mediana ponderada dessas vendas, e Vender rápido e Esperar são o 1º e o 3º
   quartis. Como é mediana, uma venda muito cara ou muito barata não puxa o resultado pelo valor.
5. **Correção:** o desvio médio do cálculo nas vendas dos últimos 7 dias é descontado dos três números.

O refino não entra no preço: vendas refinadas contam como se não tivessem refino.

## Quão confiável é

O mercado é feito por pessoas e não segue uma regra fixa: o preço serve para orientar, não para garantir. A mesma
ficha pode sair por poucas Gemas ou por muito mais, e por isso a faixa entre Vender rápido e Esperar diz mais do que o
número do meio.

A página mostra o resultado do teste contra vendas passadas, refeito a cada atualização: cada venda é precificada só
com as vendas anteriores a ela e comparada com o preço pago. A **Confiança** é a porcentagem de vezes em que o Preço justo
ficou a até 25% do valor pago, nas vendas parecidas com o Pokémon analisado, e a página também mostra se ela vem acertando.

## Atualização

Os preços são atualizados algumas vezes por dia com um novo `docs/precos.json`. A página mostra quando as vendas foram
lidas, e o botão **Novidades** lista o que mudou no site.

## Arquivos

- `docs/index.html`, `docs/app.css`, `docs/js/`: a página.
- `docs/motor/`: o cálculo do preço.
- `docs/catalogo/`: espécies (status base, tipos, golpes e evoluções) e a fórmula de PvE do jogo.
- Sprites da [PokeAPI](https://github.com/PokeAPI/sprites).

## Apoie o projeto

O site é gratuito. Quem quiser pode fazer uma doação opcional em [livepix.gg/briao](https://livepix.gg/briao).

## Licença

[MIT](LICENSE).
