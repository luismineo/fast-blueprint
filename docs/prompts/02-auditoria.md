# Prompt 02 — Auditoria de divergência

Rode ao final de cada milestone, em sessão limpa, sem o contexto de quem escreveu o código. É o prompt que mantém a spec sendo a verdade em vez de virar ficção.

```
Auditoria de divergência entre specs/ e o código.

Não implemente nada. Não corrija nada. Apenas relate.

Compare cada critério de aceitação de specs/00 a specs/10 com o estado atual
do código, e classifique em uma de quatro categorias:

  IMPLEMENTADO E TESTADO
    Existe e existe teste que o cobre. Cite o arquivo de teste.

  IMPLEMENTADO SEM TESTE
    O comportamento existe mas nenhum teste falha se ele quebrar.
    Esta é a categoria mais perigosa; liste-a primeiro.

  NÃO IMPLEMENTADO
    Diga em qual milestone deveria cair.

  DIVERGENTE
    O código faz algo diferente do que a spec descreve.
    Para cada um, diga qual dos dois você acha que está certo, e por quê.
    Divergência onde o código está certo e a spec está errada é a mais
    valiosa de achar — significa que aprendemos algo implementando.

Verifique também, independente dos critérios de aceitação:

  - Direção de dependência de specs/08. Rode depcruise e confira que a regra
    realmente pega violação, não só que ela passa.
  - Comentário em código de produção. Deve ser zero.
  - Cor hexadecimal fora de renderer/theme.ts.
  - Float em coordenada de nó.
  - Alocação dentro de pass de render.
  - Regra de negócio dentro de componente .svelte.
  - Grandeza derivada armazenada no documento em vez de calculada.

Ao final, uma lista ordenada do que corrigir primeiro, com a justificativa
de por que essa ordem — e diga qual item você corrigiria hoje mesmo se
pudesse corrigir apenas um.
```

---

## Como usar o resultado

Cada item de **DIVERGENTE** vira uma decisão sua, não do agente: ou o código muda, ou a spec muda. Nunca deixe uma divergência aberta entre milestones — é assim que a spec vira documentação morta e o processo inteiro deixa de valer o custo.

Cada item de **IMPLEMENTADO SEM TESTE** vira tarefa no milestone seguinte, antes de qualquer feature nova.
