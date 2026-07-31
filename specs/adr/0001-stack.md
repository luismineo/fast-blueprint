# ADR-0001 — Stack

**Status:** Aceita
**Data:** 2026-07-30

## Contexto

Editor de planta baixa 2D que precisa ser performático e fluido, com design simples, distribuído como aplicação desktop com GUI e/ou rodando em `localhost` no navegador. Open source e gratuito.

O desenvolvedor tem experiência sólida em TypeScript, Node e Angular, e interesse de longo prazo em computação gráfica e rendering.

## Decisão

**TypeScript + Canvas 2D com renderer próprio + Svelte 5 + Vite, empacotado em Tauri 2.**

## Alternativas de renderização

### Canvas 2D próprio — escolhida

Uma planta de apartamento tem ordem de centenas de primitivas. Canvas 2D com câmera própria, dirty flag e culling entrega os 8 ms de orçamento com folga confortável.

Um renderer próprio dá controle total sobre o que este produto depende: espessura de linha constante no zoom, hit testing em coordenadas de mundo, cotas posicionadas por normal de aresta, e a mesma lista de passes servindo canvas e SVG.

Também é a opção que mais serve ao interesse de longo prazo do desenvolvedor: escrever a câmera, o culling, o batching e o pipeline de passes à mão é exatamente o vocabulário de rendering, em duas dimensões e num escopo terminável.

### Biblioteca de canvas (Konva, Fabric, PixiJS) — rejeitada

Impõem um scene graph de nós que precisa espelhar o modelo de domínio, criando duas fontes de verdade que dessincronizam. Hit testing e snapping precisariam ser reescritos por cima da abstração delas de qualquer forma, e um segundo backend para exportar SVG fiel deixa de ser possível.

Economizam a semana da câmera e cobram nos seis meses seguintes.

### SVG com DOM — rejeitada

Ergonomia excelente (hit testing e eventos de graça), mas o custo de layout e paint do DOM cresce mal a partir de algumas centenas de nós, e a precisão do zoom via `viewBox` acumula erro. SVG continua sendo o formato de export, só não o motor de tela.

### WebGL / WebGPU — rejeitada

Overkill para polígonos planos e texto. Renderizar texto em WebGL exige atlas ou SDF — trabalho substancial para resolver um problema que o Canvas 2D já resolve bem. Reconsiderar apenas se surgir 3D, o que está fora do roadmap.

## Alternativas de plataforma

### Tauri 2 — escolhida

Binário de ~8 MB usando o webview do sistema, contra ~120 MB do Electron. Mesmo bundle web serve `localhost` e desktop, sem código duplicado. Filesystem nativo via plugin, sem processo Node embarcado. Rust aparece só na configuração de janela.

Custo real: o webview varia por plataforma (WebKitGTK no Linux, WebView2 no Windows, WKWebView no macOS), então há teste de compatibilidade a fazer. Aceitável — o app usa APIs conservadoras.

### Electron — rejeitada

Bundle 15× maior e consumo de memória proporcional, para ganhar consistência de engine que este app não precisa.

### Rust + egui/wgpu — rejeitada

Tecnicamente a opção mais forte: compila para binário nativo **e** para wasm num codebase só, performance excelente, e alinhada com o interesse do desenvolvedor em rendering.

Rejeitada por tempo até a v1. egui é modo imediato, o que atrapalha nas partes onde este app precisa de estado de interação retido (edição inline, foco de campo, arraste com histórico). O ecossistema de UI seria construído do zero, e o produto existe para resolver um problema concreto com prazo.

**Gatilho para revisitar:** se após a 1.0 o gargalo de performance for comprovadamente de render (medido, não suposto), ou se surgir demanda por 3D. O pacote `core` é TypeScript puro sem dependência de plataforma, então uma reescrita do renderer seria contida.

### Flutter — rejeitada

Cross-platform sólido, mas o desenho customizado passa por `CustomPainter`, que não é mais expressivo que Canvas 2D, e adiciona Dart a um projeto sem nenhuma outra razão para ter Dart.

### Qt / GTK nativo — rejeitada

Nega o requisito de rodar em `localhost` no navegador, que é o caminho de menor atrito para alguém experimentar o app.

## Alternativas de framework de UI

### Svelte 5 — escolhida

Chrome mínimo, compilado, sem VDOM competindo com o loop de render por tempo de main thread. Runes dão reatividade fina, o que importa quando o painel de propriedades atualiza a cada frame durante um arraste.

O documento não vive no framework (ver `08-arquitetura.md`), então a escolha é de baixo risco: trocar Svelte por outra coisa afetaria só `packages/app/components`.

### React — considerada

Ecossistema maior e mais familiar. Funcionaria. Perde no runtime carregado que este app não usa: quase toda a superfície visual é canvas, e o VDOM não ajuda em nada lá. Escolha razoável se o desenvolvedor preferir velocidade de escrita a peso de bundle.

### Angular — rejeitada

Peso e cerimônia desproporcionais para uma UI de cinco painéis. Familiaridade do desenvolvedor não compensa DI, módulos e change detection num app cujo estado central vive fora do framework por design.

## Alternativas de estado

### Immer com `produceWithPatches` — escolhida

Imutabilidade com escrita mutável, e os patches inversos saem de graça. Isso significa que undo não precisa de código de undo por comando — a maior fonte de bug em editor gráfico simplesmente não existe.

### Cópia manual imutável — rejeitada

Verbosa e propensa a erro em estruturas aninhadas, e exigiria escrever o inverso de cada comando à mão.

### Snapshot completo por operação — rejeitada

O documento é pequeno (dezenas de KB), então snapshots seriam viáveis em memória. Mas com arraste emitindo comando por frame, a pegada cresce rápido, e patches são mais precisos para coalescência.

## Consequências

**Positivas.** Um único codebase serve navegador e desktop. Domínio testável em Node puro, sem DOM. Undo praticamente de graça. Bundle pequeno e binário pequeno. O caminho de aprendizado em rendering é real e incremental.

**Negativas.** A câmera, o culling, o batching e o hit testing são código próprio a manter. Sem suporte a leitor de tela no canvas na v1. Variação de webview entre plataformas exige teste manual em cada release.

**Neutras.** A escolha de Svelte é reversível a baixo custo. A escolha de Canvas 2D não é, mas a fronteira `DrawTarget` deixa a porta aberta para um backend alternativo.
