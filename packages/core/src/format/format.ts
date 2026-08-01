// ============================================================
// Formatação e parse de medidas — spec 02 § Unidade de exibição e entrada numérica
// ============================================================

/**
 * Interpreta entrada de comprimento do usuário.
 * Regras:
 * - Número sem sufixo e sem separador decimal → centímetros
 * - Número sem sufixo com separador decimal → metros
 * - Sufixo explícito ('mm', 'cm', 'm') sempre vence
 *
 * Retorna milímetros inteiros (arredondado).
 */
export function parseLength(input: string): number {
  const trimmed = input.trim().replace(',', '.');

  if (trimmed === '') return 0;

  // Sufixo explícito
  const suffixMatch = trimmed.match(/^([\d.]+)\s*(mm|cm|m)$/i);
  if (suffixMatch) {
    const value = parseFloat(suffixMatch[1]!);
    const unit = suffixMatch[2]!.toLowerCase();
    switch (unit) {
      case 'mm':
        return Math.round(value);
      case 'cm':
        return Math.round(value * 10);
      case 'm':
        return Math.round(value * 1000);
    }
  }

  // Sem sufixo
  const num = parseFloat(trimmed);
  if (isNaN(num)) return 0;

  if (trimmed.includes('.') || trimmed.includes(',')) {
    // Tem separador → metros
    return Math.round(num * 1000);
  }

  // Sem separador → centímetros
  return Math.round(num * 10);
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