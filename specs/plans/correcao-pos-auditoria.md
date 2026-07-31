# Correções pós-auditoria — registro e análise estrutural

## Resumo de commits

| Commit | Achados | Arquivos |
|---|---|---|
| `611a8b9` | C1, S1-4 (ADR-0003) | `specs/adr/0003-modelo-de-snap.md` |
| `3b88ba2` | C1, S1 (Snap reescrito) | `specs/02-unidades-e-geometria.md` |
| `c8535ba` | C2, L1, L3, L5, L6, R1, R2, R3, R4, S1(1,2,3,5) | `specs/02`, `03`, `04`, `08`, `09` |
| `d042b70` | C3, L2, L4, S2, S3 | `specs/02`, `03`, `04`, `08` |
| `7894224` | D0-D6 (atalhos unificados) | `specs/03`, `07` |

## Destino de cada achado

| Achado | Decisão | Status |
|---|---|---|
| C1 (ordem de snap) | Substituída por ADR-0003 (três classes). Corrigido como proposto, com modelo revisado pelo autor. | Aplicado |
| C2 (merged na Cômodo) | Aplicado como proposto. | Aplicado |
| C3 (fechamento) | Algoritmo de ajuste removido; substituído por fusão com nó inicial e mensagem informativa. | Corrigido diferente |
| L1 (payloads) | Assinaturas de CreateRoom, DeleteRoom, RenameRoom em specs/08. | Aplicado |
| L2 (ToolContext) | Definido sem dispatch; ferramentas retornam comandos. | Corrigido diferente |
| L3 (ângulo) | Somente leitura no M1; entrada no M2 documentada em specs/09. | Aplicado |
| L4 (nome default) | Menor inteiro não em uso no documento. | Corrigido diferente |
| L5 (área provisória) | Algoritmo documentado em specs/02. | Aplicado |
| L6 (openings no-op) | Anotado como no-op no M1 em specs/04. | Aplicado |
| R1 (OverlayPrimitive) | Em core/ como geometria declarativa. | Aplicado |
| R2 (dirty flag) | Scheduler em app/, renderer função pura. | Aplicado |
| R3 (RenderContext) | Interface definida em specs/04. | Aplicado |
| R4 (underlay) | Fora da lista de passes; canvas separado. specs/08 atualizado. | Aplicado |
| S1 itens 1,2,3,5 | Tolerâncias com clamping, fronteira aresta/extensão, nota de performance, merged só nó. | Aplicado |
| S2 (zoom ancorado) | Autocorretivo, sem acúmulo. Formulação explícita em specs/04. Mantido 1 px. | Corrigido diferente |
| S3 (coalescência) | Substituída por comando transiente (`transient: true`). Sem janela de 400 ms. | Corrigido diferente |
| D0-D6 (atalhos) | Tabela unificada em specs/03; regra de precedência; Q/E para rotação; Ctrl/Cmd+0 e Ctrl/Cmd+B; verificação ABNT2. | Corrigido diferente |

## Decisões do autor que discordo (registro para o futuro)

**Nenhuma.** As cinco rejeições do relatório original (C1 com eixo como pré-filtro, C3 com 5%, L2 com dispatch, S2 afrouxamento para 2 px, S3 coalescência por type+alvo) estavam todas erradas pelos motivos que o autor expôs. Registro aqui apenas que não houve objeção — concordo com todas as correções.

Houve um ponto que a auditoria não cobriu e que a decisão do autor revelou: a **armadilha de foco do HUD** (D2). A decisão está correta (Tab circula entre campos do HUD durante desenho, Esc sai), mas a spec não define indicador visual de que o usuário está numa armadilha de foco. Sem indicador, um usuário que aperta Tab esperando ir para a barra de ferramentas pode achar que o app travou. Um contorno sutil no HUD (cor `accent` ou `snapGuide`) quando a armadilha está ativa resolveria. É detalhe de UX, não de arquitetura — mas merece menção para quando a UI for implementada.

---

## PARTE 4 — Varredura com D0 aplicado

### Colisões resolvidas por D0 (campo com foco vence atalho)

Estas colisões só existiam na ausência da regra de precedência. Com D0, desaparecem:

| Tecla(s) | Conflito original | Resolução |
|---|---|---|
| `0`–`9` | Enquadrar (`0`) vs. digitar medida (`320`) | `0` movido para `Ctrl/Cmd+0`. Todos os dígitos são reservados para entrada numérica. |
| `Espaço` | Pan vs. digitar "Área de serviço" | Campo com foco → pan não dispara. |
| `Delete` | Excluir seleção vs. apagar caractere | Campo com foco → apaga. Fora de campo → exclui seleção. |
| `Backspace` | Excluir seleção vs. apagar caractere | Idem. |
| `V`, `R`, `W`, `F`, `M` | Troca de ferramenta vs. digitar em campo de texto | Campo com foco → insere letra. Fora de campo → atalho dispara. |
| `G`, `L` | Alternar grid/cotas vs. digitar em campo | Campo com foco → insere letra. |
| `C` (fechar) | Fechar polígono vs. digitar "C" no nome do cômodo | Edição inline → insere "C". Fora de campo → fecha. |
| `Ctrl/Cmd+A` | Selecionar tudo vs. selecionar tudo no campo (comportamento nativo) | `Ctrl/Cmd` é exceção à regra D0 — o atalho funciona mesmo com foco. Consistente com browser. |

A regra D0 formaliza o que era "contexto mutuamente exclusivo" na cabeça de quem lê — e que implementações diferentes deduziriam diferente. As colisões listadas acima estavam erradamente classificadas como "não requer correção" no relatório original; requeriam documentação explícita da precedência.

### Colisões que sobrevivem a D0

Estas permanecem e foram resolvidas por decisão explícita:

| Tecla | Conflito | Decisão |
|---|---|---|
| `R` | Ferramenta Cômodo (global) vs. rotação de mobília | `R` = sempre Cômodo. Rotação movida para `Q`/`E`. |
| `Tab` | Travessia de foco vs. toggle de painel vs. navegação no HUD | Painel → `Ctrl/Cmd+B`. HUD → armadilha de foco. Fora → travessia padrão. |

---

## Namespaces com o mesmo problema estrutural do D5

O problema D5: dois arquivos declaram entradas do mesmo namespace sem dono único. Em atalhos, specs/03 e specs/07 declaravam teclas independentemente. A correção foi tornar specs/03 a dona única.

Varredura dos demais namespaces do projeto:

### Namespaces com dono único (sem problema)

| Namespace | Dono | Onde é referenciado |
|---|---|---|
| Tipos do modelo (Node, Room, Wall, etc.) | `specs/01` | `specs/02`, `03`, `05`, `08` |
| Invariantes (E1–E9, W1–W5) | `specs/01` | `specs/02`, `03`, `05`, `10` |
| Comandos | `specs/08` | `specs/03`, `09` |
| IDs de catálogo | `specs/06` | (nenhum outro) |
| Passes de render | `specs/04` | `specs/08`, `10` |
| Chaves de tema do renderer | `specs/04` | (nenhum outro) |
| Chaves de tema da UI | `specs/07` | (nenhum outro) |
| Milestones (M0–M10) | `specs/09` | `specs/00`, `03`, `08` |
| Fixtures | `specs/10` | `specs/fixtures/README.md` (catálogo das fixtures, não redefinição dos nomes) |

### Namespace com problema: textos de interface

**Dois arquivos declaram mensagens de UI:** `specs/07` § Textos de interface contém uma tabela de 10 strings. `specs/02` § Precisão de fechamento declara uma mensagem diferente ("O último trecho ficou com X cm") que não está na tabela de specs/07. `specs/05` § Validação declara mensagens de erro ("Não foi possível abrir o arquivo...") também ausentes da tabela de specs/07.

**Risco:** a tabela de specs/07 fica desatualizada porque o texto real é definido na spec de comportamento, não na spec de UI. Quando o comportamento muda (como aconteceu com C3), a tabela de specs/07 não é atualizada e passa a divergir.

**Gravidade:** menor que atalhos, porque mensagens de UI não quebram funcionalidade se divergirem — são texto informativo. Mas quebram a premissa de que specs/07 é a fonte da verdade para texto de interface.

**Correção proposta (não aplicada — aguardando decisão):** Duas opções: (A) specs/07 é dona e toda spec de comportamento referencia a tabela em vez de declarar texto. (B) specs/07 deixa de ter tabela própria e vira índice das mensagens definidas em cada spec. A opção (A) é mais consistente com D5.

### Namespace com risco latente: schema do documento vs. tipos do modelo

`specs/01` declara os tipos TypeScript do modelo. `specs/05` mostra um exemplo JSON do schema. Hoje são consistentes porque foram escritos juntos. O risco é: se um campo for adicionado ao tipo em specs/01 e o exemplo em specs/05 não for atualizado, o exemplo passa a ser enganoso.

**Mitigação existente:** `specs/05` diz que o schema é declarado com Zod e os tipos são inferidos dele. Se isso for respeitado na implementação, o código é a fonte da verdade e os exemplos em specs/05 são ilustrativos. O risco é baixo, mas a spec 01 deveria referenciar specs/05 explicitamente como "exemplo, não especificação normativa do formato".

### Conclusão

O único namespace com o mesmo problema estrutural do D5 é **textos de interface** (specs/02, 03, 05 e 07). Os demais namespaces têm dono único ou a duplicação é de referência (não de declaração). O problema é de menor gravidade porque a divergência não quebra funcionalidade, mas merece a mesma correção: escolher um dono e mover todas as strings para lá.

---

## O que a auditoria original não cobriu

A auditoria inicial analisou coerência conceitual entre specs (o que elas afirmam) mas não fez duas verificações que teriam exposto problemas antes:

1. **Tabulação de namespaces.** A colisão `R` e `Tab` estava visível na leitura, mas a colisão `0` com entrada numérica e a família inteira de atalhos vs. campos de texto só se revelam tabulando todas as teclas contra todos os contextos. O método correto é: para cada tecla listada em qualquer spec, verificar se há campo de texto que a consome, e se há outra spec que a reivindica. Isso não se faz lendo — se faz com uma tabela.

2. **Verificação de dono único por namespace.** A pergunta "quem é o dono dos atalhos?" teria exposto que specs/03 e specs/07 estavam brigando antes mesmo de listar as teclas. A mesma pergunta aplicada a textos de interface teria encontrado o segundo problema.

Esses dois métodos — tabulação de namespaces e verificação de dono único — deveriam entrar no processo de revisão de spec. Sugestão: adicionar ao `CLAUDE.md` uma instrução para que, ao adicionar qualquer entrada a uma lista (atalho, mensagem, comando, invariante, chave de tema), o agente verifique se a lista já tem dono em outra spec.

---

## Rodada 2 — resposta às correções do autor sobre a rodada 1

A rodada 1 registrou "decisões do autor que discordo: nenhuma" sem tentativa documentada de atacar as cinco rejeições originais — método que falhou em pegar dois erros reais do autor (Ctrl/Cmd+0 não-cancelável pelo navegador; comando não-transiente ao soltar aplicado sobre documento já mutado, quebrando undo). Esta rodada aplica veredito de três saídas, não duas, e verificação por simulação/fonte primária em vez de leitura — ambos agora registrados em `CLAUDE.md`.

### Formato de veredito

- **SUSTENTA** — decisão correta, aplicada como escrita.
- **SUSTENTA COM ADENDO** — decisão correta, spec incompleta sem o adendo listado.
- **NÃO SUSTENTA** — decisão não se sustenta, alternativa proposta.

### Item 1 — Enquadrar tudo: Ctrl/Cmd+0 → Home (specs/03)

**Veredito: SUSTENTA COM ADENDO — adendo revisado pelo autor.**

Achado por simulação/pesquisa: `Ctrl/Cmd+0`/`+`/`-` são confirmadamente não-canceláveis em Chrome e Firefox (fonte: múltiplas referências sobre a família de zoom do navegador). As demais combinações Ctrl/Cmd da tabela (`Z`, `Shift+Z`, `S`, `O`, `D`, `A`, `B`) foram eliminadas por consulta a fonte primária (lista de um engenheiro do Chromium na thread `public-webapps` do W3C das combinações que o Chrome não despacha para JS), não por memória — registrado em specs/03 como eliminação documental, não como teste empírico satisfeito.

Achado novo: `Home` colide com o padrão ARIA de toolbar (`Home`/`End` movem foco para primeiro/último botão de uma `role="toolbar"` com roving tabindex) quando a barra de ferramentas tem foco — D0 só cobria campo de texto, não widget composto.

O adendo proposto nesta análise — a barra de ferramentas não implementar `Home`/`End` no roving tabindex, para não colidir com o atalho global — foi **rejeitado pelo autor**: paga o conserto com acessibilidade num projeto cujo piso já é baixo por decisão, para acomodar um atalho de câmera. Correção aplicada em vez disso: **D0 foi reescrita** para cobrir "campo de entrada OU widget que gerencia a própria navegação por teclado" — a barra de ferramentas implementa o padrão ARIA completo, `Home` inclusos, sem sacrifício e sem conflito, porque a regra de precedência (e não a tecla) decide qual dos dois vence.

### Item 2 — Histórico: entrada pendente (specs/08)

**Veredito: SUSTENTA COM ADENDO — política de `Ctrl/Cmd+Z` revisada pelo autor.**

O mecanismo central (`PendingEntry`, commit/abort via `ToolTransition.historyBoundary`, undo em ordem reversa à acumulação, compactação restrita a `replace` em caminho idêntico) foi validado por simulação numérica de um arraste de 3 passos — aplicar os inversos na ordem de acumulação produz um documento diferente do início do arraste; em ordem reversa, correto. Confirma que a exigência de ordem reversa não é estética.

A lacuna identificada — o que `Ctrl/Cmd+Z` faz com uma entrada pendente aberta — foi aceita como o melhor achado da rodada, com a resposta de propriedade (`DocumentStore.undo()` é quem verifica, não a ferramenta) aceita como escrita. A política escolhida nesta análise — reusar o mecanismo de Abort — foi **rejeitada pelo autor**: só é fisicamente possível ter uma entrada pendente aberta com o botão do ponteiro ainda pressionado, e abortar exigiria `DocumentStore.undo()` (código de `core/history`, sem DOM) alcançar `app/` para liberar `pointer capture` e resetar o estado da ferramenta — cruzando a fronteira core/app sem mecanismo de sinalização existente, e sem definir o que um `pointerup` órfão faz depois. Decisão final: **ignorar** — `Ctrl/Cmd+Z` é consumido sem efeito enquanto a entrada está aberta, a interação continua até o `pointerup` normal, e um segundo `Ctrl/Cmd+Z` depois de soltar desfaz o arraste inteiro.

### Item 3 — Textos de interface: messages.ts (specs/07, com referências em 02/05)

**Veredito: SUSTENTA COM ADENDO — escopo do adendo ampliado pelo autor.**

O achado da mensagem composta (aviso de alterações não salvas, com dois botões embutidos) foi aceito, junto com as duas convenções propostas (chave própria por elemento interativo embutido; exceção de lint para glifo estrutural e saída de `core/format`). Correção de escopo do autor: a convenção de interpolação não é caso isolado da mensagem de autosave — toda mensagem com dado interpolado (`closeDeviation`, `ioErrors.orphanNodeRef`, `furnitureOverlap`, `unsavedChanges`) segue a mesma forma. `messages.ts` guarda **função**, não string, quando há dado — sem mini-linguagem de template, sem placeholder textual; o tipo da função é o contrato, mantendo o paralelo com a decisão já aceita para o schema Zod.

### Item 4 — Fixtures: README como dono (specs/10, specs/fixtures/README.md)

**Veredito: SUSTENTA COM ADENDO — aceito integralmente.**

A distinção proposta — tolerância de teste e área útil agregada são regra de estratégia (ficam em specs/10), a tabela por cômodo e a narrativa de disposição são inventário/autoria (vão para o README) — foi aceita sem alteração, por já decorrer do próprio critério que a decisão original invocava ("specs/10 continua dono da estratégia, não do inventário").

### Decisões do autor que discordo desta rodada (registro real, não vazio)

Ao contrário da rodada 1, esta tem conteúdo: as saídas propostas para os itens 1 e 2 foram substituídas pelas do autor, por razões que a simulação/pesquisa desta análise não alcançou sozinha:

- **Item 1:** a análise resolveu a colisão ARIA no lado errado (reduzir o widget) em vez do lado certo (ampliar a regra de precedência). O autor identificou que o defeito estava em D0, não na escolha de tecla.
- **Item 2:** a análise escolheu a política de `Ctrl/Cmd+Z` por elegância de reuso de código (Abort já existe) em vez de simular o estado físico do ponteiro até o fim. O autor forçou essa simulação (o que acontece no `pointermove` e no `pointerup` seguintes) e isso decidiu a favor de "ignorar".

Isso é o resultado que faltou na rodada 1: tentativa real de discordância, com dois casos em que ela procedeu.