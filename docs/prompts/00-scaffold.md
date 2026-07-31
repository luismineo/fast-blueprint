# Prompt 00 — Scaffold e crítica das specs

Use uma vez, num repositório contendo apenas `CLAUDE.md`, `README.md` e `specs/`.

Rode em **plan mode**. Este prompt tem duas fases e um portão humano entre elas — não deixe o agente atravessar sozinho.

---

## Fase 1 — Crítica (nenhum código)

```
Este repositório contém apenas especificações. Nenhuma linha de código foi escrita.

Leia, nesta ordem:
  1. CLAUDE.md
  2. specs/00-visao-e-escopo.md
  3. specs/adr/0001-stack.md e specs/adr/0002-modelo-geometrico.md
  4. specs/01 a specs/10
  5. specs/fixtures/README.md

Não escreva código nesta fase. Sua tarefa é encontrar os problemas nas specs
antes que eles virem código.

Produza um relatório com quatro seções:

CONTRADIÇÕES
  Onde duas specs afirmam coisas incompatíveis. Cite arquivo e seção das duas.

LACUNAS
  Comportamento que o M1 precisa e que nenhuma spec define. Só o que bloqueia
  o M1 — não catalogue tudo que falta no produto inteiro.

SUBESTIMATIVAS
  Onde a spec descreve como simples algo que não é. Especificamente: verifique
  se o resolvedor de snap de specs/02 é implementável como descrito, com a
  ordem de prioridade dada, sem ambiguidade sobre snaps que se combinam.

RISCOS DE ARQUITETURA
  Onde a estrutura de specs/08 vai brigar com o que specs/03 e specs/04 exigem.

Para cada item: o problema, por que importa, e a correção que você propõe.
Ordene por impacto no M1.

Ao final, uma pergunta única: qual a decisão que mais mudaria o projeto se
estiver errada, e o que você faria para descobrir isso barato.

Pare aqui e aguarde.
```

**Portão.** Leia o relatório. Corrija as specs você mesmo, ou instrua o agente a corrigi-las em commits separados, um por item. Não deixe correção de spec e implementação no mesmo commit.

---

## Fase 2 — Scaffold (M0)

Só depois que as specs estiverem corrigidas.

```
Implemente o M0 de specs/09-roadmap.md.

ESCOPO
  Monorepo pnpm com os cinco pacotes de specs/08-arquitetura.md.
  TypeScript strict com noUncheckedIndexedAccess.
  Vite, Vitest, ESLint, dependency-cruiser.
  Alias @fixtures apontando para specs/fixtures no tsconfig.base.json.
  CI em .github/workflows/ci.yml com a sequência de specs/10-testes.md.
  Canvas em tela cheia com câmera: pan, zoom ancorado no cursor,
  grid adaptativo e escala gráfica.
  Um CLAUDE.md de 5 a 10 linhas em cada pacote, cobrindo só o que é local
  àquele pacote. Não repita o CLAUDE.md da raiz.

FORA DE ESCOPO
  Nenhuma entidade de domínio. Nenhuma ferramenta. Nenhum comando.
  Não antecipe M1. Se sentir vontade de criar packages/core/src/model,
  pare — não é este milestone.

ANTES DE CODAR
  Apresente o plano: lista de tarefas, cada uma com os arquivos que toca e o
  critério que a encerra. Pare e aguarde aprovação. Não grave arquivo ainda.

DEPOIS DE APROVADO
  Primeira ação: gravar o plano aprovado em specs/plans/m0-esqueleto.md,
  em commit próprio, antes de qualquer código.
  Depois, uma tarefa por commit. Mensagem no imperativo, em português.
  Rode pnpm typecheck && pnpm test && pnpm depcruise antes de cada commit.
  Se um comando falhar, corrija antes de seguir. Não acumule falha.

CRITÉRIO DE ENCERRAMENTO
  Os critérios de aceitação do M0 em specs/09-roadmap.md, mais:
  navegação em grid infinito a 60fps medida pelo profiler,
  e dependency-cruiser falhando de propósito se core importar de renderer
  (teste a regra antes de confiar nela).

REGRAS
  Zero comentário em código de produção.
  Nenhuma cor hexadecimal fora de renderer/theme.ts.
  Nenhuma dependência nova sem justificar no plano.
  Se uma spec estiver ambígua, pare e pergunte. Não decida por conta.
```

---

## Por que esta ordem

A Fase 1 existe porque as specs foram escritas antes de qualquer código, e specs assim sempre têm pelo menos uma contradição e uma subestimativa. Descobrir isso lendo custa uma hora; descobrir implementando custa uma semana.

A pergunta final da Fase 1 força o agente a sair do modo "revisor educado" e apontar o risco real, que costuma ser o item mais valioso do relatório inteiro.