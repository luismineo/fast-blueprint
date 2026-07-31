# CLAUDE.md

Contexto operacional para agentes trabalhando neste repositório. Leia antes de qualquer alteração.

## O que é o Planta

Editor de planta baixa 2D open source para planejamento de apartamentos pequenos. Desenha cômodos a partir de medidas tiradas com trena, calcula área útil, e permite testar layouts de mobília.

**Não é um CAD.** Toda decisão de escopo passa por: "um usuário que mediu as paredes com trena consegue reproduzir a planta em menos de 10 minutos, sem tutorial?" Se a feature não sobrevive a essa pergunta, ela não entra.

Não modelamos: espessura de parede, camadas, blocos, cotas associativas, 3D, materiais, hidráulica, elétrica.

## Specs são a fonte da verdade

Este projeto usa spec driven development. As specs em `specs/` descrevem o comportamento pretendido; o código é a implementação delas.

**Fluxo obrigatório para qualquer mudança de comportamento:**

1. Localize a spec que cobre a área afetada (índice em `specs/00-visao-e-escopo.md`).
2. Se a mudança contradiz a spec, atualize a spec **primeiro**, num commit separado.
3. Se a mudança não é coberta por nenhuma spec, adicione a seção antes de codar.
4. Implemente contra os critérios de aceitação da spec.
5. Cada critério de aceitação vira pelo menos um teste.

Se uma spec estiver ambígua ou conflitante, **pare e pergunte**. Não resolva ambiguidade de spec inventando comportamento no código.

Decisões arquiteturais vão para `specs/adr/` como ADR numerada. ADR aceita não se edita: cria-se uma nova que a supersede.

## Revisão de listas e decisões de spec

**Checklist de dono de lista.** Antes de adicionar entrada a qualquer lista (atalho, mensagem, comando, invariante, chave de tema, fixture), localize a spec dona da lista. Se duas specs declaram a lista, pare: escolha o dono antes de adicionar.

**Formato de veredito ao revisar uma decisão de spec.** Uma decisão não é só aprovada ou rejeitada — o caso mais comum é o do meio, e o formato de veredito precisa admitir isso:

- **SUSTENTA** — decisão correta, aplicar como escrita.
- **SUSTENTA COM ADENDO** — decisão correta, mas a spec está incompleta; o adendo é obrigatório e entra listado junto do veredito, não como observação solta.
- **NÃO SUSTENTA** — decisão não se sustenta; propor alternativa.

**Método de verificação.** Verificar uma decisão de spec por simulação ou consulta a fonte primária, nunca só por leitura. Simular a sequência concreta que o mecanismo vai enfrentar (ex.: aplicar patches inversos passo a passo, numa ordem específica, e comparar o resultado) encontra em poucas linhas bugs que reler o texto da spec não encontra. Quando a dúvida é sobre comportamento de plataforma externa (navegador, SO, biblioteca), buscar a fonte primária em vez de assumir por memória.

## Estrutura

```
packages/
  core/       Domínio puro. Zero dependência de DOM, canvas ou framework.
  renderer/   Canvas 2D. Lê estado do core, desenha. Não muta domínio.
  app/        Svelte 5 + Vite. Chrome de UI, atalhos, painéis.
  catalog/    Catálogo de mobília em JSON + loader.
desktop/      Tauri 2. Shell nativo, acesso a filesystem.
specs/        Especificações. Fonte da verdade.
```

**Regra de dependência (unidirecional):** `app → renderer → core`. `core` não importa nada dos outros. Violar isso é o erro mais grave possível neste repo.

## Comandos

```bash
pnpm install
pnpm dev              # Vite em localhost:5173
pnpm dev:desktop      # Tauri em modo dev
pnpm test             # Vitest, todos os pacotes
pnpm test:core        # Só o domínio (rápido, roda em watch enquanto desenvolve)
pnpm typecheck        # tsc --noEmit em todos os pacotes
pnpm build            # Bundle web
pnpm build:desktop    # Binário nativo
```

## Convenções de código

- **Sem comentários em código de produção.** Se o trecho precisa de comentário, ele precisa de um nome melhor ou de extração para função nomeada. Exceções: `// eslint-disable` justificado e docstrings de API pública em `core/`.
- Clean Architecture e SOLID. Regra de negócio em `core/`, nunca em componente Svelte.
- Regras de negócio configuráveis (tolerâncias de snap, incrementos de grid, presets de rotação) vivem em objetos de configuração tipados, não em literais espalhados.
- Funções do domínio são puras. Efeito colateral (I/O, canvas, storage) fica na borda.
- Nomes de tipos e identificadores em inglês. Textos de UI e specs em pt-BR.
- Sem `any`. Sem `as` que não seja narrowing de discriminated union.
- Mutação de documento só via comandos (`specs/08-arquitetura.md`). Nada de mutar `doc` direto.

## Unidades

**Todo o domínio é em milímetros inteiros.** Sempre. Conversão para metros/centímetros acontece exclusivamente na camada de apresentação.

Se você viu um float em coordenada de nó, é bug. Ver `specs/02-unidades-e-geometria.md`.

## Performance

O loop de render tem orçamento de 8 ms por frame. Antes de aceitar uma mudança no renderer:

- Nenhuma alocação dentro do loop de desenho (sem `map`, `filter`, spread, template string por frame).
- Redesenho é dirty-flag + `requestAnimationFrame`, nunca redesenho síncrono em evento de mouse.
- Espessura de linha e tamanho de handle são constantes em pixels de tela, independentes do zoom.

## Definition of done

Uma tarefa só está pronta quando:

- [ ] Critérios de aceitação da spec correspondente passam como teste automatizado
- [ ] `pnpm typecheck` e `pnpm test` limpos
- [ ] Nenhuma violação da regra de dependência
- [ ] Se o comportamento mudou, a spec foi atualizada no mesmo PR
- [ ] Se é comando de domínio, o inverso foi testado (undo → redo → undo devolve o documento original)

## Caso de teste de referência

`specs/fixtures/apto-44m2.planta.json` é a planta real que motivou o projeto: 44 m², 2 quartos, envelope 5,90 × 7,90 m. Testes de integração usam essa fixture. Se uma mudança quebra a reprodução dela, a mudança está errada.

## Armadilhas conhecidas

- **Não introduza espessura de parede** "só pra ficar mais realista". É decisão de escopo registrada na ADR-0002.
- **Não troque Canvas 2D por uma lib de canvas** (Konva, Fabric, PixiJS). ADR-0001 explica o custo.
- **Não coloque estado de documento em store Svelte.** O documento vive no `DocumentStore` do core; Svelte assina.
- **Snap não é opcional na arquitetura.** Toda criação de geometria passa pelo resolvedor de snap, mesmo quando desligado (aí ele retorna identidade).
