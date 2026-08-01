import type { HexColor } from './types';

/**
 * Cores oferecidas para preenchimento de cômodo.
 *
 * Isto é **dado de documento**, não token de tema: o usuário escolhe, o valor
 * é serializado no arquivo, e trocar o tema não o altera
 * (`04-renderizacao.md` § Cor de cômodo não é token de tema). Por isso mora
 * aqui, junto do modelo, e não em `renderer/theme.ts`.
 *
 * Dessaturadas de propósito: o preenchimento é fundo de uma planta que precisa
 * continuar legível sob cotas, rótulos e mobília.
 */
export const ROOM_COLORS: readonly HexColor[] = [
  '#EDE7DC',
  '#E3E9E1',
  '#DDE5EC',
  '#E9E2EC',
  '#F0E4DC',
  '#E2E8E8',
  '#ECE9D8',
  '#E6E4E0',
] as unknown as readonly HexColor[];

export function isRoomColor(value: string): value is HexColor {
  return (ROOM_COLORS as readonly string[]).includes(value);
}
