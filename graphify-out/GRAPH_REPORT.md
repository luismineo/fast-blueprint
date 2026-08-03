# Graph Report - .  (2026-08-02)

## Corpus Check
- 220 files · ~144,942 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1361 nodes · 3100 edges · 113 communities (86 shown, 27 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 59 edges (avg confidence: 0.79)
- Token cost: 366,715 input · 0 output

## Community Hubs (Navigation)
- Furniture Actions & Commands
- Command Framework Core
- Catalog Panel Model
- Wall & Room Commands
- Furniture Geometry & Warnings
- Render Bench & Furniture Glyph
- Command Application Engine
- Selection Panel Model
- Wall Tool
- Catalog Merge & Warnings Tests
- Geometry & Screen Coordinates
- Overlay Style System
- Direction Freeze & Geometry
- Snap Model (ADR-0003)
- Furniture Panel Tests
- Furniture Integration Tests
- Camera System
- Architecture Spec: Commands
- Canvas Input Handling
- Room Tool
- Overlay & Snap Index
- TypeScript Base Config
- Dimension Rendering Pass
- Selection Rendering Pass
- Wall Modeling (ADR-0002)
- Tauri Desktop Config
- App Package Dependencies
- Furniture Tool
- Document Schemas (Zod)
- Lint & Static Analysis Tooling
- Roadmap & Wall Commands
- Furniture Nudge & Shortcuts
- Measure Tool
- Snap Model Classes Detail
- App Room Centroid Rendering
- Milestone Docs & Units
- App TypeScript Config
- M1 Roadmap & Post-mortem
- CLAUDE.md Process Docs
- Core Package Dependencies
- Catalog Package Dependencies
- Core TypeScript Config
- Domain Model Spec Details
- Package Scripts
- Render Scheduler
- Room Tool Property Tests
- Catalog TypeScript Config
- Snap Tests
- Renderer Profiler
- Design Principles & Invariants
- Furniture Domain Spec
- Testing Strategy Spec
- Spec-Driven Dev & Scope
- Package CLAUDE.md Files
- Angle Formatting
- Renderer Package Dependencies
- Renderer TypeScript Config
- Toolbar Model
- Wall Payload & Topology Tests
- HUD & Scale Bar
- Versioning (ADR-0004)
- Package Metadata
- UI Message Catalog
- Document Model
- Renderer Test Harness
- Version Sync Script
- E2E Test Specs
- Room Props Tests
- Furniture Command Tests
- Stack Decisions (ADR-0001)
- Lint Rule Tests
- No-Literal-Text ESLint Rule
- Version Check Script
- Volatile Meta Fields
- Dependency Rule & Workspace
- Svelte ESLint Plugin Dep
- Playwright Test Dep
- Svelte Dep
- Svelte ESLint Parser Dep
- TypeScript Dep
- TypeScript ESLint Dep
- Vitest Dep
- Vitest Coverage Dep
- Scope Boundaries Spec
- Export Spec
- Render Budget Note
- Scope Problem Statement
- DocumentMeta Spec
- Node Spec
- Opening Spec
- Underlay Spec
- Grid Snap Class
- Hit Test Result Spec
- Constant Line Thickness Spec
- Adaptive Grid Spec
- File Migrations Spec
- Underlay File Format Spec
- Catalog Search Spec
- Responsive Layout Spec

## God Nodes (most connected - your core abstractions)
1. `applyCommand()` - 67 edges
2. `NodeId` - 60 edges
3. `createEmptyDocument()` - 51 edges
4. `PlanDocument` - 47 edges
5. `RoomId` - 41 edges
6. `Point` - 38 edges
7. `FurnitureId` - 30 edges
8. `DocumentStore` - 28 edges
9. `RenderContext` - 28 edges
10. `distance()` - 26 edges

## Surprising Connections (you probably didn't know these)
- `Checklist de dono de lista` --semantically_similar_to--> `Tabela unificada de atalhos`  [INFERRED] [semantically similar]
  CLAUDE.md → specs/03-ferramentas-e-interacao.md
- `Formato de veredito de revisão de spec (SUSTENTA / SUSTENTA COM ADENDO / NÃO SUSTENTA)` --semantically_similar_to--> `Prompt de auditoria de divergência spec × código`  [INFERRED] [semantically similar]
  CLAUDE.md → docs/prompts/02-auditoria.md
- `Princípios de design` --shares_data_with--> `Armadilhas conhecidas`  [INFERRED]
  specs/00-visao-e-escopo.md → CLAUDE.md
- `Instância preenchida: M3.5 — Símbolos, parede e medida` --references--> `Catálogo do usuário`  [EXTRACTED]
  docs/prompts/01-milestone.md → specs/06-catalogo-de-mobilia.md
- `Prompt de auditoria de divergência spec × código` --conceptually_related_to--> `CLAUDE.md — app (Svelte 5 UI chrome)`  [INFERRED]
  docs/prompts/02-auditoria.md → packages/app/CLAUDE.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **As cinco ferramentas implementam a interface Tool<S>** — specs_03_ferramentas_e_interacao_tool_interface, specs_03_ferramentas_e_interacao_ferramenta_comodo, specs_03_ferramentas_e_interacao_ferramenta_parede, specs_03_ferramentas_e_interacao_ferramenta_selecionar, specs_03_ferramentas_e_interacao_ferramenta_mobilia, specs_03_ferramentas_e_interacao_ferramenta_medir [EXTRACTED 1.00]
- **Pacotes do monorepo governados pela regra de dependência unidirecional** — claude_md_dependency_rule, packages_app_claude_md, packages_catalog_claude_md, packages_core_claude_md, packages_renderer_claude_md, desktop_claude_md_tauri_shell [INFERRED 0.85]
- **RenderContext, DrawTarget, passes e glifo formam o pipeline de renderização** — specs_04_renderizacao_rendercontext, specs_04_renderizacao_drawtarget, specs_04_renderizacao_passes_de_desenho, specs_04_renderizacao_mobilia_glifo [EXTRACTED 1.00]
- **Ferramenta Parede e comandos CreateWall/DeleteWall entregues no M3.5** — specs_08_arquitetura_createwall, specs_08_arquitetura_deletewall, specs_plans_m3_5_simbolos_parede_e_medida_ferramenta_parede, specs_09_roadmap_m3_5 [EXTRACTED 0.95]
- **Padrão de verificação por simulação/integração antes de codar, adotado após o M1** — specs_plans_m1_pos_mortem, specs_plans_m2_editar, specs_plans_m3_mobiliar [INFERRED 0.80]
- **Evolução do modelo de resolução de snap: três classes definidas e depois recalibradas por medição no protótipo** — specs_adr_0003_modelo_de_snap, specs_adr_0005_tolerancias_de_snap, specs_plans_correcao_pos_auditoria [EXTRACTED 0.90]

## Communities (113 total, 27 thin omitted)

### Community 0 - "Furniture Actions & Commands"
Cohesion: 0.05
Nodes (85): batched(), deleteFurnitureCommands(), DUPLICATE_OFFSET_MM, duplicateCommands(), movable(), nudgeCommands(), rotateCommands(), FurnitureGeometry (+77 more)

### Community 1 - "Command Framework Core"
Cohesion: 0.05
Nodes (47): CommandError, CommandResult, LEFT, measure(), n(), RIGHT, twoAdjacentRooms(), dragFrame() (+39 more)

### Community 2 - "Catalog Panel Model"
Cohesion: 0.08
Nodes (40): CatalogGroup, CatalogPanelModel, describeCatalog(), pushRecent(), recentEntries(), catalog, itemsOf(), thumbnailBox() (+32 more)

### Community 3 - "Wall & Room Commands"
Cohesion: 0.08
Nodes (36): AddFurnitureCommand, AddFurniturePayload, applyCreateWall(), applyMergeNodes(), BatchCommand, BatchPayload, CommandErrorCode, CreateRoomCommand (+28 more)

### Community 4 - "Furniture Geometry & Warnings"
Cohesion: 0.11
Nodes (31): hasSeparatingAxis(), pointStrictlyInPolygon(), satOverlap(), flagCache, warningCache, codes(), overlaps(), checkE1() (+23 more)

### Community 5 - "Render Bench & Furniture Glyph"
Cohesion: 0.14
Nodes (19): bare, furnished, FurnitureGlyph, Size, clearPass(), BED, ItemSpec, furnitureClearancePass() (+11 more)

### Community 6 - "Command Application Engine"
Cohesion: 0.13
Nodes (31): furnishedRoom(), applied(), applyAddFurniture(), applyBatch(), applyCommand(), applyCreateRoom(), applyDeleteFurniture(), applyDeleteRoom() (+23 more)

### Community 7 - "Selection Panel Model"
Cohesion: 0.14
Nodes (27): describeSelection(), describeWarnings(), edgeModel(), emptyModel(), entityName(), furnitureModel(), joinNames(), multiModel() (+19 more)

### Community 8 - "Wall Tool"
Cohesion: 0.12
Nodes (28): angleOverride(), Candidate, candidateOf(), coincidesWithLast(), confirm(), DraftNode, dropLast(), EMPTY_INPUT (+20 more)

### Community 9 - "Catalog Merge & Warnings Tests"
Cohesion: 0.10
Nodes (23): mergeCatalogs(), deg(), item(), ItemSpec, mm(), ROOM, roomDoc(), Degrees (+15 more)

### Community 10 - "Geometry & Screen Coordinates"
Cohesion: 0.14
Nodes (27): roundMm(), writeArcPoints(), writeCorner(), writeObbCorners(), furnitureFlags, worldToScreenX(), arcBuffer, clipHatchLine() (+19 more)

### Community 11 - "Overlay Style System"
Cohesion: 0.13
Nodes (21): OverlayRole, cache, DIAMOND_ROLES, MARKER_HALF_PX, overlayStyles(), SNAP_GUIDE_ROLES, TOOL_OVERLAY_ROLES, alignmentGuide (+13 more)

### Community 12 - "Direction Freeze & Geometry"
Cohesion: 0.18
Nodes (23): freezeDirection(), freezeDirection(), angle(), centroid(), clipAgainstEdge(), closestPointOnSegment(), containment, convexIntersection() (+15 more)

### Community 13 - "Snap Model (ADR-0003)"
Cohesion: 0.17
Nodes (22): ADR-0003, snapToGrid(), alignmentConstraint(), alignmentDirections(), angleBetweenDeg(), axisConstraint(), clampTolerance(), cleanDirection() (+14 more)

### Community 14 - "Furniture Panel Tests"
Cohesion: 0.11
Nodes (21): BED, ItemSpec, ROOM, selectBed, withItem(), Candidate, NamingRequest, DragNode (+13 more)

### Community 15 - "Furniture Integration Tests"
Cohesion: 0.16
Nodes (17): BED, makeHarness(), ROOM, DraftNode, EditRequest, initialSelectState(), LEFT, makeHarness() (+9 more)

### Community 16 - "Camera System"
Cohesion: 0.20
Nodes (16): Camera, CAMERA_LIMITS, clamp(), frameRect(), panBy(), screenToWorld(), worldToScreen(), zoomAt() (+8 more)

### Community 17 - "Architecture Spec: Commands"
Cohesion: 0.11
Nodes (22): 08 — Arquitetura, Comando AddFurniture, Comando Batch, Compactação de patches replace em caminho idêntico, Comando CreateRoom, Decisão: Ctrl/Cmd+Z ignorado durante entrada pendente aberta, Comando DeleteFurniture, Comando DeleteRoom (+14 more)

### Community 18 - "Canvas Input Handling"
Cohesion: 0.16
Nodes (18): applyWheelIntent(), beginPanDrag(), CAMERA_INPUT_CONFIG, classifyWheel(), continuePanDrag(), endsPanDrag(), FocusLike, homeCamera() (+10 more)

### Community 19 - "Room Tool"
Cohesion: 0.20
Nodes (20): candidateOf(), closeRoom(), closesOnFirstNode(), coincidesWithLast(), confirm(), dropLast(), EMPTY_INPUT, formatCentimeters() (+12 more)

### Community 20 - "Overlay & Snap Index"
Cohesion: 0.15
Nodes (14): Point, GlyphPrimitive, attachTo(), DEFAULT_FURNITURE_SNAP_CONFIG, FurniturePlacement, FurnitureSnapConfig, FurnitureSnapContext, rectangleToSegment() (+6 more)

### Community 21 - "TypeScript Base Config"
Cohesion: 0.11
Nodes (18): DOM, DOM.Iterable, ES2022, ./specs/fixtures/*, compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules (+10 more)

### Community 22 - "Dimension Rendering Pass"
Cohesion: 0.25
Nodes (11): formatLength(), worldToScreenY(), dimensionsPass(), drawDimension(), resolveNode(), doc, viewport, roomFillsPass() (+3 more)

### Community 23 - "Selection Rendering Pass"
Cohesion: 0.20
Nodes (16): roomPoints(), buffer(), drawEdge(), drawHandle(), drawHover(), drawRoomOutline(), drawSelected(), isSelected() (+8 more)

### Community 24 - "Wall Modeling (ADR-0002)"
Cohesion: 0.13
Nodes (18): Comando CreateWall, Regra de dependência unidirecional entre pacotes, ADR-0002 — Modelo geométrico: parede sem espessura, cômodo como ciclo, Opening ancorado a EdgeRef + offset, Decisão 2: cômodo é um ciclo de nós desenhado explicitamente, Alternativa rejeitada: detecção automática de faces (half-edge), Entidade Wall — paredes avulsas, ADR-0006 — Glifos de mobília como dados declarativos (+10 more)

### Community 25 - "Tauri Desktop Config"
Cohesion: 0.12
Nodes (16): app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist (+8 more)

### Community 26 - "App Package Dependencies"
Cohesion: 0.12
Nodes (16): dependencies, @planta/catalog, @planta/core, @planta/renderer, @planta/core, name, private, scripts (+8 more)

### Community 27 - "Furniture Tool"
Cohesion: 0.25
Nodes (14): CatalogEntry, FurnitureDraft, FurnitureToolContext, FurnitureToolEvent, FurnitureToolState, furnitureToolTransition(), initialFurnitureState(), present() (+6 more)

### Community 28 - "Document Schemas (Zod)"
Cohesion: 0.12
Nodes (15): documentMetaSchema, edgeRefSchema, furnitureIdSchema, furnitureItemSchema, hexColorSchema, nodeIdSchema, nodeSchema, openingIdSchema (+7 more)

### Community 29 - "Lint & Static Analysis Tooling"
Cohesion: 0.13
Nodes (15): @eslint/js, fast-check, devDependencies, dependency-cruiser, @eslint/js, fast-check, svelte-check, @sveltejs/vite-plugin-svelte (+7 more)

### Community 30 - "Roadmap & Wall Commands"
Cohesion: 0.15
Nodes (15): Comando DeleteWall, Comando SplitNode, 09 — Roadmap, M10 — Acessibilidade do canvas, M2 — Editar, M3.5 — Símbolos, parede e medida, M4 — Persistir, M5 — Desktop (+7 more)

### Community 31 - "Furniture Nudge & Shortcuts"
Cohesion: 0.20
Nodes (11): NUDGE_COARSE_MM, NUDGE_MM, SelectToolEvent, ARROWS, classifyKey(), focusedFieldEmpty(), FocusKind, FurnitureAction (+3 more)

### Community 32 - "Measure Tool"
Cohesion: 0.20
Nodes (12): FurnitureToolResult, MeasureToolContext, MeasureToolEvent, MeasureToolResult, MeasureToolState, measureToolTransition(), present(), RoomToolResult (+4 more)

### Community 33 - "Snap Model Classes Detail"
Cohesion: 0.20
Nodes (14): ADR-0003 — Modelo de snap: três classes, não lista linear, Classe 1 — Âncora de ponto (nó, ponto médio), Classe 2 — Restrição de reta (aresta, extensão, eixo, alinhamento), Classe 3 — Grid (fallback), Alternativa rejeitada: eixo como pré-filtro, SnapResult (point, targets, merged), ADR-0005 — Tolerâncias de snap medidas no protótipo, Tabela de tolerâncias revisada (Classe 1: 200mm, Classe 2: 250mm, Classe 3: 300mm) (+6 more)

### Community 35 - "Milestone Docs & Units"
Cohesion: 0.15
Nodes (13): Armadilhas conhecidas, Unidade de domínio: milímetro inteiro, Instância preenchida: M1 — Desenhar e medir, Nota sobre autorar a fixture pelo próprio app, Template de prompt de milestone, Room (cômodo), Cálculo de área (shoelace), Classe 2 — Restrição de reta (+5 more)

### Community 36 - "App TypeScript Config"
Cohesion: 0.15
Nodes (12): compilerOptions, composite, declaration, outDir, rootDir, types, extends, include (+4 more)

### Community 37 - "M1 Roadmap & Post-mortem"
Cohesion: 0.17
Nodes (13): M1 — Desenhar e medir, M3 — Mobiliar, M1 — Desenhar e medir: plano aprovado, Máquina de estados da Ferramenta Cômodo (Idle→Anchored→Drawing→Closed/Cancelled), M1 — Post-mortem, Causa raiz: suíte não exercitava caminho de integração, Defeito: ids de nó fixos colapsavam cômodo numa linha, Lições: teste sobre payload não prova nada; rodar o app é parte da verificação (+5 more)

### Community 38 - "CLAUDE.md Process Docs"
Cohesion: 0.18
Nodes (12): Definition of done, Planta (produto), Fixture de referência apto-44m2, Formato de veredito de revisão de spec (SUSTENTA / SUSTENTA COM ADENDO / NÃO SUSTENTA), Fase 1 — Crítica das specs, Fase 2 — Scaffold do M0, Por que Fase 1 vem antes da Fase 2, Prompt de auditoria de divergência spec × código (+4 more)

### Community 39 - "Core Package Dependencies"
Cohesion: 0.17
Nodes (11): immer, dependencies, immer, zod, zod, main, name, private (+3 more)

### Community 40 - "Catalog Package Dependencies"
Cohesion: 0.17
Nodes (11): dependencies, @planta/core, zod, @planta/core, zod, main, name, private (+3 more)

### Community 41 - "Core TypeScript Config"
Cohesion: 0.17
Nodes (11): compilerOptions, composite, declaration, outDir, rootDir, types, extends, include (+3 more)

### Community 42 - "Domain Model Spec Details"
Cohesion: 0.29
Nodes (11): Instância preenchida: M3.5 — Símbolos, parede e medida, EdgeRef, Achatamento de arco (writeArcPoints), Classe 1 — Âncora de ponto, Ferramenta Medir (M), Ferramenta Selecionar (V), DrawTarget, Mobília / Glifo / Nível de detalhe (+3 more)

### Community 43 - "Package Scripts"
Cohesion: 0.18
Nodes (11): scripts, bench, build, depcruise, dev, e2e, lint, test (+3 more)

### Community 44 - "Render Scheduler"
Cohesion: 0.25
Nodes (4): CancelFrame, RenderCallback, RequestFrame, Scheduler

### Community 45 - "Room Tool Property Tests"
Cohesion: 0.38
Nodes (9): initialRoomState(), makeHarness(), arbSegments, drawPolygon(), RoomToolEvent, RoomToolState, roomToolTransition(), exactNodeAt() (+1 more)

### Community 46 - "Catalog TypeScript Config"
Cohesion: 0.18
Nodes (10): compilerOptions, composite, declaration, outDir, rootDir, extends, include, src (+2 more)

### Community 47 - "Snap Tests"
Cohesion: 0.20
Nodes (6): DEFAULT_CONFIG, SnapContext, SnapNode, n1, n2, horizontal

### Community 48 - "Renderer Profiler"
Cohesion: 0.25
Nodes (3): average(), PassTiming, Profiler

### Community 49 - "Design Principles & Invariants"
Cohesion: 0.25
Nodes (11): Princípios de design, Invariantes (validateDocument, E1-E9, W1-W5), Wall (parede avulsa), Entrada numérica / parseLength, Hit testing, Snap a parede, Ferramenta Parede (W), Cotas (+3 more)

### Community 50 - "Furniture Domain Spec"
Cohesion: 0.18
Nodes (11): FurnitureItem, Grandezas derivadas (área, perímetro, ocupação), Geometria de mobília (OBB, SAT), Precisão de fechamento (closeDeviation), Ferramenta Mobília (F), Persistência (desktop/browser/autosave), Validação (parse, migração, invariantes), Catálogo default (55 itens) (+3 more)

### Community 51 - "Testing Strategy Spec"
Cohesion: 0.20
Nodes (11): 10 — Estratégia de testes, bench/render.bench.ts — testes de performance, Sequência de CI (version:check → typecheck → lint → depcruise → test → build → e2e), E2E de fumaça (Playwright), Tolerância de teste da fixture apto-44m2 (0,30 m²/cômodo, 0,50 m² total), Property tests obrigatórios (comandos invertíveis, área consistente, snap idempotente etc.), RecordingTarget — backend SVG como alvo de teste de render, Decisão 1: parede é uma linha, sem espessura (+3 more)

### Community 52 - "Spec-Driven Dev & Scope"
Cohesion: 0.24
Nodes (10): Checklist de dono de lista, Fluxo de desenvolvimento orientado a spec, Fast Blueprint / Planta (README), Índice de specs, PlanDocument, Tabela unificada de atalhos, Interface Tool<S> / ToolContext / ToolTransition, Schema PlanDocumentSchema (Zod) (+2 more)

### Community 53 - "Package CLAUDE.md Files"
Cohesion: 0.24
Nodes (10): CLAUDE.md — app (Svelte 5 UI chrome), index.html (ponto de entrada da app), CLAUDE.md — catalog, CLAUDE.md — core (domínio puro), CLAUDE.md — renderer (Canvas 2D), Câmera (pan/zoom/enquadrar), Câmera (transformação mundo↔tela), Zoom ancorado no cursor (+2 more)

### Community 54 - "Angle Formatting"
Cohesion: 0.42
Nodes (7): angleOverride(), degreesToRadians(), formatAngle(), parseLength(), parseTerm(), tryParseAngle(), tryParseLength()

### Community 55 - "Renderer Package Dependencies"
Cohesion: 0.20
Nodes (9): dependencies, @planta/core, @planta/core, main, name, private, scripts, test (+1 more)

### Community 56 - "Renderer TypeScript Config"
Cohesion: 0.20
Nodes (9): compilerOptions, composite, declaration, outDir, rootDir, extends, include, src (+1 more)

### Community 57 - "Toolbar Model"
Cohesion: 0.33
Nodes (6): moveToolbarFocus(), TOOLBAR_BUTTONS, ToolbarButton, ToolbarId, toolbarIndexOf(), ToolId

### Community 58 - "Wall Payload & Topology Tests"
Cohesion: 0.25
Nodes (7): CreateWallPayload, DeleteWallPayload, LEFT, n(), RIGHT, twoAdjacentRooms(), WallId

### Community 59 - "HUD & Scale Bar"
Cohesion: 0.39
Nodes (5): hudPass(), computeScaleBar(), formatScaleLabel(), SCALE_BAR_CONFIG, ScaleBarSpec

### Community 60 - "Versioning (ADR-0004)"
Cohesion: 0.22
Nodes (9): M0 — Esqueleto, ADR-0004 — Versionamento, Decisão 5: meta.appVersion e VOLATILE_META_FIELDS, Decisão 6: sem CHANGELOG antes da 1.0, Decisão 2: esquema 0.M.P até a 1.0 (M = último milestone concluído), Decisão 1: fonte única de versão em package.json raiz, Decisão 4: schemaVersion independente da versão do app, M0 — Esqueleto: plano aprovado (+1 more)

### Community 61 - "Package Metadata"
Cohesion: 0.25
Nodes (7): engines, node, name, packageManager, private, type, version

### Community 62 - "UI Message Catalog"
Cohesion: 0.29
Nodes (4): messages, referencedKeys(), sourceFiles(), SRC

### Community 63 - "Document Model"
Cohesion: 0.39
Nodes (6): CURRENT_SCHEMA_VERSION, generateDefaultRoomName(), generateNodeId(), generateRoomId(), isValidDocument(), DocumentMeta

### Community 65 - "Version Sync Script"
Cohesion: 0.25
Nodes (7): cargoToml, cargoTomlPath, packageJsonPath, rootDir, tauriConf, tauriConfPath, updatedCargoToml

### Community 66 - "E2E Test Specs"
Cohesion: 0.48
Nodes (4): WALLS, canvasOrigin(), drawRoom(), Origin

### Community 67 - "Room Props Tests"
Cohesion: 0.33
Nodes (5): checkColor(), n(), oneRoom(), ROOM, isDocumentColor()

### Community 68 - "Furniture Command Tests"
Cohesion: 0.33
Nodes (6): ITEM, OFF_PALETTE, QUEEN, ROOM, roomDoc(), withQueen()

### Community 69 - "Stack Decisions (ADR-0001)"
Cohesion: 0.33
Nodes (6): Interface Command / applyCommand (Immer produceWithPatches), ADR-0001 — Stack, Decisão: Canvas 2D próprio (renderer), Decisão: Immer com produceWithPatches (estado/undo), Decisão: Svelte 5 (framework de UI), Decisão: Tauri 2 (plataforma desktop)

### Community 70 - "Lint Rule Tests"
Cohesion: 0.40
Nodes (4): eslint, eslint, lint(), ROOT

### Community 71 - "No-Literal-Text ESLint Rule"
Cohesion: 0.50
Nodes (3): insideSkipped(), noLiteralText, SKIPPED_ANCESTORS

### Community 72 - "Version Check Script"
Cohesion: 0.40
Nodes (4): cargoToml, distinctVersions, rootDir, versions

### Community 74 - "Dependency Rule & Workspace"
Cohesion: 0.67
Nodes (3): Regra de dependência unidirecional (app → renderer → core), Shell nativo Tauri 2 (desktop), Workspace pnpm (packages/*)

## Ambiguous Edges - Review These
- `Opening ancorado a EdgeRef + offset` → `Ferramenta Medir — máquina de estados (Idle→Dragging→Done, zero comandos)`  [AMBIGUOUS]
  specs/plans/m3-5-simbolos-parede-e-medida.md · relation: conceptually_related_to

## Knowledge Gaps
- **380 isolated node(s):** `furnished`, `bare`, `$schema`, `productName`, `version` (+375 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **27 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Opening ancorado a EdgeRef + offset` and `Ferramenta Medir — máquina de estados (Idle→Dragging→Done, zero comandos)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `PlanDocument` connect `Command Framework Core` to `Furniture Actions & Commands`, `Wall & Room Commands`, `Furniture Command Tests`, `Room Props Tests`, `Furniture Geometry & Warnings`, `Selection Panel Model`, `Render Bench & Furniture Glyph`, `Catalog Merge & Warnings Tests`, `Geometry & Screen Coordinates`, `Furniture Panel Tests`, `Furniture Integration Tests`, `Dimension Rendering Pass`, `Selection Rendering Pass`, `Wall Payload & Topology Tests`, `Document Model`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Why does `NodeId` connect `Furniture Panel Tests` to `Furniture Actions & Commands`, `Command Framework Core`, `Wall & Room Commands`, `Furniture Geometry & Warnings`, `Render Bench & Furniture Glyph`, `Selection Panel Model`, `Wall Tool`, `Catalog Merge & Warnings Tests`, `Snap Model (ADR-0003)`, `Furniture Integration Tests`, `Room Tool`, `Dimension Rendering Pass`, `Selection Rendering Pass`, `Document Schemas (Zod)`, `Measure Tool`, `Room Tool Property Tests`, `Snap Tests`, `Wall Payload & Topology Tests`, `Document Model`, `Room Props Tests`, `Furniture Command Tests`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Why does `Point` connect `Overlay & Snap Index` to `Furniture Actions & Commands`, `Measure Tool`, `Command Framework Core`, `Wall & Room Commands`, `Furniture Geometry & Warnings`, `Wall Tool`, `Geometry & Screen Coordinates`, `Direction Freeze & Geometry`, `Room Tool Property Tests`, `Furniture Panel Tests`, `Furniture Integration Tests`, `Snap Model (ADR-0003)`, `Snap Tests`, `Room Tool`, `Selection Rendering Pass`, `Furniture Tool`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **What connects `furnished`, `bare`, `$schema` to the rest of the system?**
  _380 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Furniture Actions & Commands` be split into smaller, more focused modules?**
  _Cohesion score 0.05196717862402693 - nodes in this community are weakly interconnected._
- **Should `Command Framework Core` be split into smaller, more focused modules?**
  _Cohesion score 0.050774526678141134 - nodes in this community are weakly interconnected._