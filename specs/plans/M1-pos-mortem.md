# M1 — O que a spec 03 errou

A spec `03-ferramentas-e-interacao.md` descreve a máquina de estados da Ferramenta Cômodo. Implementei cada transição. Abaixo, o que estava errado ou omisso.

## 1. Duplo clique em Anchored é indefinido

A spec lista duplo clique como mecanismo de fechamento na tabela de "Fechar o polígono". Mas Anchored só tem 1 ponto. Um duplo clique em Anchored não pode confirmar "o segmento" (não há segmento) nem "fechar" (faltam 2 nós). A implementação trata como no-op.

**O que a spec deveria ter dito:** "Duplo clique fecha o polígono. Só dispara se `confirmedNodes.length >= 2`." Ou então listar duplo clique como mecanismo exclusivo do estado Drawing, não como propriedade da ferramenta como um todo.

## 2. `C`, `Enter` vazio e clique no nó inicial com < 3 nós total

A spec diz "Fechamento com menos de 3 nós é ignorado", mas não especifica se a ferramenta:
- volta para Idle,
- permanece no estado corrente,
- emite um aviso visual,
- ou faz outra coisa.

A implementação optou por permanecer no estado corrente, silenciosamente. Essa escolha é consistente — o usuário pode ter apertado `C` sem querer e não perdeu nada — mas a spec deveria ter explicitado o comportamento esperado. "Ignorar" é ambíguo.

## 3. Conflito entre clique e entrada numérica parcial

A spec diz que "digitar qualquer dígito em estado Anchored ou Drawing foca automaticamente o campo de comprimento". Também diz que "clique confirma no ponto resolvido pelo snap". O que acontece quando o campo contém dígitos parciais (ex: usuário digitou `32` mas ainda não deu Enter) e clica no canvas?

A implementação decidiu que o clique vence — o valor parcial do campo é descartado. Isso é consistente com a ideia de que clicar é a ação mais intencional (movimento de mouse + clique vs. digitar alguns números). Mas a spec nunca abordou essa interação. Ela trata os três caminhos de confirmação como independentes, sem discutir o que acontece na transição entre eles.

## 4. Primeiro dígito: replace vs. append

A spec diz que digitar dígito "foca automaticamente" o campo. Mas foco programático em um campo de texto normalmente seleciona o conteúdo existente. Se o campo já tem um valor (ex: de um segmento anterior), o primeiro dígito substitui ou concatena?

A implementação adotou select-all (substitui). A spec não diz nada sobre isso. É um detalhe de UX que afeta diretamente o fluxo de desenho — se o campo não fizer select-all, o usuário que desenhou um segmento de 320 e agora quer 250 precisa apagar manualmente `320` antes de digitar `250`. Com select-all, o primeiro dígito já limpa e substitui.

## 5. `Backspace` vs. `Esc`: diferença sutil

Ambos removem o último segmento quando o campo de comprimento está vazio. Mas `Backspace` com campo preenchido **edita o texto** (comportamento padrão de campo), enquanto `Esc` com campo preenchido **não faz nada** ou deveria limpar o campo?

A spec documenta o caso do campo vazio mas não diz o que `Esc` faz com campo preenchido. A implementação optou por: `Esc` remove o último dígito (como Backspace) e depois, se o campo ficar vazio, remove o segmento. Isso é diferente do que a spec deixa implícito (que `Esc` só remove segmento, não dígito).

## 6. `C` vs. clique no nó inicial: assimetria de snap

`C` fecha o polígono independentemente de onde o cursor está — ele liga o último nó confirmado ao nó inicial, com ou sem snap. Já o clique no nó inicial depende do resolvedor de snap (Classe 1) encontrar o nó inicial dentro da tolerância. Se o zoom está muito afastado e o nó inicial está fora da tolerância, o clique fecha em um ponto novo (criando um nó quase-idêntico e violando E6), enquanto `C` fecha corretamente reusando o nó existente.

A spec lista os dois como equivalentes ("Fecha, reusando o nó" vs. "Fecha ligando o último nó ao inicial"), mas eles não são equivalentes — um depende de tolerância de pixel, o outro é determinístico. A spec deveria ter reconhecido essa assimetria e talvez recomendado que o clique no nó inicial usasse uma tolerância maior (ou uma busca explícita por proximidade ao nó inicial, sem passar pelo resolvedor de snap completo).

## 7. A máquina de estados esconde subestados de entrada numérica

O diagrama `Idle → Anchored → Drawing → (Closed | Cancelled)` tem 4 estados. Mas na prática, `Drawing` tem dois subestados radicalmente diferentes:
- **Seguindo mouse:** o segmento fantasma segue o cursor; `pointerMove` atualiza o HUD
- **Entrada numérica congelada:** o segmento está travado na direção do último snap; o mouse move mas não afeta o segmento

A spec menciona o congelamento ("A direção usada com entrada numérica é a direção após snap de eixo"), mas não modela isso como parte do estado. Na implementação, `frozenDirection` e `inputValue` são campos do estado `Drawing`. O diagrama de 4 estados é simplificado demais — um diagrama realista teria ao menos 5 ou 6 estados.

## 8. Ausência de definição para `pointerMove` durante entrada numérica

A spec não diz o que acontece com o preview de snap durante a entrada numérica. O cursor do mouse continua se movendo, e o snap preview (marcador de nó sob o cursor) deve continuar ativo ou deve ser suprimido?

A implementação manteve o snap preview ativo — o usuário pode ver que está perto de um nó e decidir cancelar a entrada numérica para clicar no nó. A spec não menciona esse caso. Se o snap preview fosse suprimido, o usuário perderia informação durante a digitação.

## Recomendações para revisão da spec 03

1. Substituir o diagrama de 4 estados por uma tabela de transições completa (como a que está em `specs/plans/m1-desenhar-e-medir.md`).
2. Especificar o comportamento de cada combinação (estado, evento, condição), incluindo os casos de < 3 nós e conflitos de entrada.
3. Documentar a política de replace vs. append no campo de comprimento.
4. Esclarecer a diferença entre `C` e clique no nó inicial, e entre `Backspace` e `Esc`.
5. Adicionar uma seção sobre "estados implícitos da entrada numérica" — congelamento de direção, preview durante digitação, foco de campo.