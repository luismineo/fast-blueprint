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
  hudSummary: (sides: number, area: string) => `${sides} lados · ${area}`,

  roomNameLabel: 'Nome do cômodo',

  summaryTitle: 'Resumo',
  summaryUsableArea: 'Área útil',
  summaryRoomCount: 'Cômodos',

  emptyCanvas: 'Pressione R e clique para começar a desenhar um cômodo',
} as const
