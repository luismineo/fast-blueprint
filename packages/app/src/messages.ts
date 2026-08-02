/**
 * Fonte da verdade de todo texto de interface (`07-ui-e-layout.md`
 * § Textos de interface). Nenhum literal de texto em componente `.svelte`.
 *
 * Mensagens com dado em tempo de execução são **funções**, não strings com
 * placeholder: a assinatura é o contrato e o compilador rejeita a chamada
 * com o tipo errado.
 */
export const messages = {
  hudLabel: 'Medidas do segmento',
  hudLengthLabel: 'Comprimento em centímetros',
  hudAngleLabel: 'Ângulo em graus',
  unitCm: 'cm',
  unitDegree: '°',
  hudSummary: (sides: number, area: string) => `${sides} lados · ${area}`,

  roomNameLabel: 'Nome do cômodo',

  toolbarLabel: 'Ferramentas',
  toolSelect: 'Selecionar',
  toolRoom: 'Cômodo',
  toolWall: 'Parede',
  toolFurniture: 'Mobília',
  toolMeasure: 'Medir',
  toolTooltip: (name: string, shortcut: string) => `${name} (${shortcut})`,
  toolUnavailable: (name: string) => `${name} — ainda não disponível`,

  summaryUsableArea: 'Área útil',
  summaryTotalArea: 'Área total',
  summaryRoomCount: 'Cômodos',

  panelTitle: 'Propriedades',
  panelRoomName: 'Nome',
  panelArea: 'Área',
  panelPerimeter: 'Perímetro',
  panelColor: 'Cor',
  panelColorNone: 'Sem cor',
  panelColorOption: (position: number) => `Cor ${position}`,
  panelCountsAsUsable: 'Contar na área útil',
  panelDelete: 'Excluir',
  panelLength: 'Comprimento',
  panelAngle: 'Ângulo',
  panelAdjacentRooms: 'Cômodos',
  panelX: 'X',
  panelY: 'Y',
  panelConnectedRooms: 'Cômodos',
  panelRoomCount: 'Cômodos',
  panelNodeCount: 'Nós',
  panelEdgeCount: 'Arestas',
  panelFurnitureCount: 'Móveis',

  panelFurnitureName: 'Nome',
  panelWidth: 'Largura',
  panelDepth: 'Profundidade',
  panelRotation: 'Rotação',
  panelClearance: 'Circulação',
  panelLocked: 'Travar',
  panelDuplicate: 'Duplicar',
  panelSaveToCatalog: 'Salvar como item',
  panelSaveCategory: 'Categoria',
  panelSaveConfirm: 'Salvar',
  panelSavedToCatalog: 'Salvo no seu catálogo',
  panelOccupancy: 'Ocupação',
  panelWarnings: 'Avisos',

  selfIntersectingRoom: 'paredes que se cruzam',
  overlappingRooms: 'cômodos sobrepostos',
  furnitureOutsideRoom: 'fora do cômodo',
  furnitureOverlap: (nameA: string, nameB: string) => `${nameA} e ${nameB} se sobrepõem`,

  edgeLengthLabel: 'Comprimento da aresta em centímetros',
  sharedNodeMoveTogether: 'Mover junto',
  sharedNodeDetachOnly: 'Só este cômodo',

  catalogTitle: 'Catálogo',
  catalogSearchLabel: 'Buscar no catálogo',
  catalogSearchPlaceholder: 'cama, geladeira, mesa',
  catalogNoResults: 'Nenhum item com esse termo',
  catalogRecent: 'Recentes',
  catalogCategory: {
    quarto: 'Quarto',
    sala: 'Sala',
    cozinha: 'Cozinha',
    banheiro: 'Banheiro',
    servico: 'Área de serviço',
    escritorio: 'Escritório',
    circulacao: 'Circulação',
  },

  emptyCanvas: 'Pressione R e clique para começar a desenhar um cômodo',
} as const
