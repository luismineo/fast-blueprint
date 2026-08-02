import type { FurnitureId, PlanDocument } from './types';
import { validateDocument, type ValidationIssue } from './validation';

/**
 * Estado de aviso por móvel, derivado das invariantes W3 e W4.
 *
 * O renderer desenha o contorno tracejado e a hachura a partir daqui, e o
 * painel lista os mesmos avisos: uma fonte só, para o que a tela mostra e o que
 * o painel diz nunca discordarem.
 *
 * Memoizado na identidade do documento (`08-arquitetura.md` § Estado derivado).
 * O documento é imutável, então comparação por referência basta — e é o que
 * mantém o pass de desenho sem trabalho O(n²) por frame durante pan e zoom.
 */
export interface FurnitureFlags {
  readonly outsideRoom: ReadonlySet<FurnitureId>;
  readonly colliding: ReadonlySet<FurnitureId>;
}

const warningCache = new WeakMap<PlanDocument, ValidationIssue[]>();
const flagCache = new WeakMap<PlanDocument, FurnitureFlags>();

export function documentWarnings(doc: PlanDocument): ValidationIssue[] {
  const cached = warningCache.get(doc);
  if (cached) return cached;

  const issues = validateDocument(doc).filter((issue) => issue.level === 'warning');
  warningCache.set(doc, issues);
  return issues;
}

export function furnitureFlags(doc: PlanDocument): FurnitureFlags {
  const cached = flagCache.get(doc);
  if (cached) return cached;

  const outsideRoom = new Set<FurnitureId>();
  const colliding = new Set<FurnitureId>();

  for (const issue of documentWarnings(doc)) {
    if (issue.code === 'W3') {
      for (const id of issue.ids) outsideRoom.add(id as FurnitureId);
    } else if (issue.code === 'W4') {
      for (const id of issue.ids) colliding.add(id as FurnitureId);
    }
  }

  const flags: FurnitureFlags = { outsideRoom, colliding };
  flagCache.set(doc, flags);
  return flags;
}
