// ============================================================
// Formatação e parse de medidas — spec 02 § Unidade de exibição e entrada numérica
// ============================================================

const TERM_PATTERN = /^(\d*\.?\d+)\s*(mm|cm|m)?$/i;

/**
 * Interpreta um termo isolado de comprimento, em milímetros (ainda fracionário).
 *
 * Regras (spec 02 § Entrada numérica):
 * - Número sem sufixo e sem separador decimal → centímetros
 * - Número sem sufixo com separador decimal → metros
 * - Sufixo explícito ('mm', 'cm', 'm') sempre vence
 */
function parseTerm(input: string): number | null {
  const normalized = input.trim().replace(',', '.');
  if (normalized === '') return null;

  const match = normalized.match(TERM_PATTERN);
  if (!match) return null;

  const value = parseFloat(match[1]!);
  if (!Number.isFinite(value)) return null;

  const unit = match[2]?.toLowerCase();
  if (unit === 'mm') return value;
  if (unit === 'cm') return value * 10;
  if (unit === 'm') return value * 1000;

  return normalized.includes('.') ? value * 1000 : value * 10;
}

/**
 * Interpreta entrada de comprimento do usuário, em milímetros inteiros.
 *
 * Aceita soma e subtração de termos (`158+40` → 1980). Cada termo segue as
 * regras de unidade de forma independente; o arredondamento acontece na soma,
 * não termo a termo.
 *
 * Devolve `null` quando a entrada não resolve — o campo que a recebeu mantém o
 * texto e não aplica valor.
 */
export function tryParseLength(input: string): number | null {
  const pieces = input
    .trim()
    .split(/([+-])/)
    .map((piece) => piece.trim())
    .filter((piece) => piece !== '');

  if (pieces.length === 0) return null;

  let sign = 1;
  let index = 0;

  if (pieces[0] === '+' || pieces[0] === '-') {
    sign = pieces[0] === '-' ? -1 : 1;
    index = 1;
  }

  let total = 0;

  while (index < pieces.length) {
    const term = parseTerm(pieces[index]!);
    if (term === null) return null;
    total += sign * term;
    index += 1;

    if (index === pieces.length) break;

    const operator = pieces[index];
    if (operator !== '+' && operator !== '-') return null;
    sign = operator === '-' ? -1 : 1;
    index += 1;

    if (index === pieces.length) return null;
  }

  return Math.round(total);
}

/**
 * Como `tryParseLength`, mas devolve 0 no lugar de `null`.
 *
 * É o que o HUD de desenho consome, onde um campo em construção
 * (`3`, `32`, `320`) precisa de um número a cada tecla.
 */
export function parseLength(input: string): number {
  return tryParseLength(input) ?? 0;
}

/**
 * Interpreta entrada de ângulo em graus, referência no eixo X positivo e
 * sentido crescente para baixo (spec 03 § HUD de desenho).
 *
 * Normaliza para [0, 360). Devolve `null` quando não resolve.
 */
export function tryParseAngle(input: string): number | null {
  const normalized = input.trim().replace(',', '.');
  if (normalized === '') return null;
  if (!/^[+-]?\d*\.?\d+$/.test(normalized)) return null;

  const value = parseFloat(normalized);
  if (!Number.isFinite(value)) return null;

  return ((value % 360) + 360) % 360;
}

/**
 * Formata comprimento em milímetros para exibição.
 * unit: 'm' → "3,20 m", 'cm' → "320 cm"
 */
export function formatLength(mm: number, unit: 'm' | 'cm'): string {
  if (unit === 'cm') {
    return `${Math.round(mm / 10)} cm`;
  }
  const meters = mm / 1000;
  return `${meters.toFixed(2).replace('.', ',')} m`;
}

/**
 * Formata o par de dimensões de um móvel em centímetros inteiros, sem unidade:
 * `158 × 198`.
 *
 * É o rótulo desenhado dentro do retângulo (`04-renderizacao.md` § Mobília).
 * Quem precisa da unidade — o cartão do catálogo — compõe com `unitCm`, em vez
 * de repetir "cm" nos dois números.
 */
export function formatDimensions(widthMm: number, depthMm: number): string {
  return `${Math.round(widthMm / 10)} × ${Math.round(depthMm / 10)}`;
}

/**
 * Formata área em mm² para exibição.
 * Ex: 8_000_000 → "8,00 m²"
 */
export function formatArea(mm2: number): string {
  const m2 = mm2 / 1_000_000;
  return `${m2.toFixed(2).replace('.', ',')} m²`;
}

/**
 * Formata ângulo em radianos para exibição.
 * Ex: Math.PI/2 → "90,0°"
 */
export function formatAngle(rad: number): string {
  const deg = (rad * 180) / Math.PI;
  // Normaliza para 0–360
  const normalized = ((deg % 360) + 360) % 360;
  return `${normalized.toFixed(1).replace('.', ',')}°`;
}

/** Graus (0–359) para radianos, mesma convenção de `tryParseAngle`. */
export function degreesToRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}
