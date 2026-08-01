# M1 — Desenhar e medir: plano aprovado

Plano de implementação do M1 (`specs/09-roadmap.md`), aprovado antes de qualquer código. Uma tarefa por commit, na ordem abaixo. Antes de cada commit: `pnpm typecheck && pnpm test && pnpm depcruise`.

## Máquina de estados da Ferramenta Cômodo

### Estados

```
Idle → Anchored → Drawing → (Closed | Cancelled)
```

- **Idle.** Nenhum traço. Cursor em cruz. Preview do snap sob o cursor.
- **Anchored.** Um `pointerDown` definiu a âncora. Mouse define direção; HUD mostra comprimento e ângulo.
- **Drawing.** Um ou mais segmentos confirmados. Idêntico a Anchored mais polilinha construída e área provisória.

### Confirmar segmento

| Gatilho | Comportamento |
|---|---|
| Clique (`pointerDown`) | Confirma no ponto resolvido pelo snap |
| Dígito + `Enter` | Confirma na direção congelada com comprimento digitado |

### Fechar polígono

| Gatilho | Condição | Comportamento |
|---|---|---|
| Clique no nó inicial | `SnapResult.merged === firstNodeId` | Fecha reusando o nó |
| `C` | `confirmedNodes.length >= 2` | Fecha ligando ao nó inicial |
| `Enter` com campo vazio | `confirmedNodes.length >= 2` | Idem `C` |
| Duplo clique | `confirmedNodes.length >= 2` | Confirma segmento e fecha |

### Cancelar / desfazer

| Gatilho | Estado | Transição |
|---|---|---|
| `Esc` | Drawing (≥ 2 segmentos) | Drawing → Drawing |
| `Esc` | Drawing (1 segmento) | Drawing → Anchored |
| `Esc` | Anchored | Anchored → Idle |
| `Backspace` (campo vazio) | Idêntico a `Esc` | Mesma lógica |
| Botão direito | Qualquer | Equivale a `Esc` |

### Transições indefinidas na spec 03

1. Duplo clique em Anchored → ignorado (no-op)
2. `C` / `Enter` vazio com < 3 nós → permanece no estado atual
3. Clique com dígitos parciais no campo → clique vence, descarta valor parcial
4. Botão direito em Idle → no-op (Ferramenta Selecionar não existe no M1)
5. `Tab` sem campo focado → foca o campo de comprimento
6. Primeiro dígito com campo contendo valor → select-all, substitui
7. Mouse move durante entrada numérica → segmento congelado, snap preview continua ativo

## Tarefas

**T0 — Gravar plano aprovado.** Este arquivo.

**T1 — Domínio: `core/model`.** Schemas Zod, `validateDocument`, `createEmptyDocument`.

**T2 — Geometria: `core/geometry`.** Shoelace, orientação, ponto-em-polígono, projeções.

**T3 — Formatação: `core/format`.** `parseLength`, `formatLength`, `formatArea`, `formatAngle`.

**T4 — Snap: `core/snap`.** Resolvedor 3 classes (nó, eixo, grid), `SnapResult`.

**T5 — Comandos e histórico: `core/commands` + `core/history`.** `CreateRoom`, `DeleteRoom`, `RenameRoom`, `DocumentStore`, `History`.

**T6 — Renderer: passes de geometria.** `roomFills`, `walls`, `dimensions`, `roomLabels`, `snapGuides`, `toolOverlay`.

**T7 — App: Ferramenta Cômodo e HUD.** Máquina de estados, HUD com armadilha de foco.

**T8 — Testes de integração e property tests.** Teste R+clique+320+250+320+C, property tests com fast-check 200 runs.

**T9 — Fixtures autoradas no app.** `single-room`, `shared-nodes`, `concave`, `apto-44m2`.

**T10 — Cobertura, CI, pos-mortem.** ≥ 90% core, CI verde, `M1-pos-mortem.md`.