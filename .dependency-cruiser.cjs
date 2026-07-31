/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'core-nao-depende-de-nada',
      comment:
        'core e dominio puro (specs/08-arquitetura.md). Importar qualquer outro pacote e o erro mais grave possivel neste repositorio.',
      severity: 'error',
      from: { path: '^packages/core' },
      to: { path: '^packages/(catalog|renderer|app)|^desktop' },
    },
    {
      name: 'catalog-so-depende-de-core',
      comment: 'catalog depende so de core (specs/08-arquitetura.md).',
      severity: 'error',
      from: { path: '^packages/catalog' },
      to: { path: '^packages/(renderer|app)|^desktop' },
    },
    {
      name: 'renderer-so-depende-de-core',
      comment: 'renderer depende so de core (specs/08-arquitetura.md).',
      severity: 'error',
      from: { path: '^packages/renderer' },
      to: { path: '^packages/(catalog|app)|^desktop' },
    },
    {
      name: 'app-nao-depende-de-desktop',
      comment:
        'desktop empacota app como build artifact (specs/08-arquitetura.md); a dependencia e nessa direcao, nunca ao contrario.',
      severity: 'error',
      from: { path: '^packages/app' },
      to: { path: '^desktop' },
    },
  ],
  options: {
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.base.json' },
    exclude: { path: 'node_modules' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },
  },
}
