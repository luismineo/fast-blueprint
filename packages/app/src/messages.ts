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

  edgeLengthLabel: 'Comprimento da aresta em centímetros',
  sharedNodeMoveTogether: 'Mover junto',
  sharedNodeDetachOnly: 'Só este cômodo',

  emptyCanvas: 'Pressione R e clique para começar a desenhar um cômodo',
} as const
