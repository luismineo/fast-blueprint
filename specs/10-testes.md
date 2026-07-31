# 10 — Estratégia de testes

## Distribuição

A pirâmide é deliberadamente pesada na base, porque quase todo o risco deste produto é geométrico e o domínio é puro.

| Camada | Peso | Ferramenta |
|---|---|---|
| Unidade em `core` | 70% | Vitest, Node puro |
| Property tests em geometria e comandos | 15% | fast-check |
| Integração de ferramentas | 10% | Vitest com eventos sintéticos |
| E2E de fumaça | 5% | Playwright |

Não há teste de componente Svelte. Se um componente merece teste, ele tem lógica que deveria estar em `core`.

## Property tests

O tipo de teste que realmente encontra bug em geometria. Casos obrigatórios:

**Comandos são invertíveis.**
Para todo documento válido e todo comando aplicável, aplicar o comando e depois seus patches inversos devolve o documento original, estruturalmente idêntico.

**Área é consistente.**
Para todo polígono simples gerado, a área por shoelace é igual à soma dos triângulos da triangulação por fan, dentro da tolerância de arredondamento inteiro.

**Área é invariante a transformação rígida.**
Transladar e rotacionar um cômodo em 90° não altera a área.

**Fechamento sempre fecha.**
Para toda sequência de comprimentos e direções, a ferramenta Cômodo produz um ciclo cujo último nó é o primeiro.

**Snap é idempotente.**
Aplicar o resolvedor de snap ao resultado de um snap devolve o mesmo ponto.

**Parse de medida é total.**
Para toda string gerada pelo formatador, `parseLength(format(x)) === x` na precisão de exibição.

**Nós nunca colidem.**
Para toda sequência de comandos aplicada a um documento válido, a invariante E6 (nenhum par de nós com coordenadas idênticas) se mantém.

**Undo restaura.**
Para toda sequência de comandos, `n` undos seguidos de `n` redos devolve o mesmo documento.

Geradores em `core/testing/arbitraries.ts`: `arbNode`, `arbSimplePolygon`, `arbDocument`, `arbCommand`, `arbLengthInput`.

`arbSimplePolygon` gera polígonos garantidamente não auto-interceptantes por ordenação angular em torno do centroide.

## Fixtures

Em `specs/fixtures/`, versionadas, usadas por testes e por desenvolvimento manual.

| Arquivo | Conteúdo |
|---|---|
| `empty.planta.json` | Documento vazio válido |
| `single-room.planta.json` | Um retângulo 3200 × 2500 |
| `apto-44m2.planta.json` | Apartamento de referência completo, 7 cômodos |
| `shared-nodes.planta.json` | Dois cômodos com aresta compartilhada |
| `concave.planta.json` | Cômodo em L, para centroide e ponto-em-polígono |
| `furnished.planta.json` | `apto-44m2` com 40 móveis, para teste de performance |
| `invalid-orphan-node.planta.json` | Referência a nó inexistente, para teste de erro |
| `legacy/v0.planta.json` | Formato antigo, para teste de migração |

### Apartamento de referência

`apto-44m2` reproduz o apartamento que motivou o projeto. Envelope 5900 × 7900 mm, sete cômodos:

| Cômodo | Medida cotada | Área esperada |
|---|---|---|
| Estar/jantar | 2400 × 4900 (mais hall) | 12,25 m² |
| Cozinha / área de serviço | 3400 × 1800 (mais avanço de 1000) | 6,75 m² |
| Dormitório 01 | 3200 × 2500 | 8,30 m² |
| Dormitório 02 | 3200 × 2300 | 7,04 m² |
| Banheiro | 2200 × 1200 | 2,55 m² |
| Circulação | — | 0,99 m² |
| Sacada | 2400 × 900 | 2,25 m² |

As áreas da planta legal não batem exatamente com o produto das medidas cotadas, porque a planta legal considera espessura de parede e o Planta não. **A tolerância de teste é 0,30 m² por cômodo e 0,50 m² no total.** Essa divergência é esperada e documentada — não é bug, é consequência direta da decisão da ADR-0002.

Área útil esperada excluindo sacada: aproximadamente 37,9 m².

## Testes de render

Não há golden image na v1 — comparação de pixel é frágil e cara de manter.

Em vez disso, o backend SVG do `DrawTarget` (`04-renderizacao.md`) serve de alvo de teste: os passes desenham num backend que grava uma lista de primitivas, e o teste assere sobre a lista.

```ts
const target = new RecordingTarget()
renderPass('dimensions', ctx, target)
expect(target.texts).toContainEqual({ text: '3,20 m', ... })
```

Testa o que importa (a cota certa apareceu, no lugar certo) sem travar em antialiasing.

## Testes de performance

`bench/render.bench.ts` com Vitest bench, rodando a fixture `furnished` por 200 frames e reportando p50 e p95 por pass.

Roda em CI apenas em PR marcado com label `perf`, porque a variância de runner compartilhado gera falso positivo. O número que vale é o local.

Regressão maior que 30% no p95 exige justificativa no PR.

## E2E

Playwright, apenas fumaça, contra o build de produção:

1. App carrega, canvas visível
2. Desenhar um cômodo por teclado produz a área correta no painel
3. Inserir móvel do catálogo aparece no canvas
4. Salvar e reabrir preserva a geometria
5. Undo depois de excluir cômodo restaura o cômodo

E2E não cobre variação de comportamento. Isso é trabalho dos testes de unidade.

## CI

```
pnpm typecheck
pnpm lint
pnpm depcruise
pnpm test --coverage
pnpm build
pnpm e2e
```

Cobertura mínima em `core`: 90% de linhas. Nos demais pacotes não há mínimo — cobertura de UI é métrica enganosa.

## Critérios de aceitação

- [ ] Suíte de `core` roda em menos de 5 s
- [ ] Todos os property tests listados existem e passam com 200 runs
- [ ] Fixture `apto-44m2` valida sem issue de nível `error`
- [ ] Área útil da fixture bate com a planta legal dentro de 0,50 m²
- [ ] Teste de migração carrega `legacy/v0.planta.json` sem perda de dado
- [ ] `RecordingTarget` cobre todos os passes de `04-renderizacao.md`
- [ ] CI falha se a cobertura de `core` cair abaixo de 90%
