import type { IoWarning } from './errors';

export function repairDocument(doc: unknown): { repaired: unknown; warnings: IoWarning[] } {
  const warnings: IoWarning[] = [];
  const isObj = typeof doc === 'object' && doc !== null;
  if (!isObj) return { repaired: doc, warnings };

  const repaired = { ...(doc as Record<string, unknown>) };

  if (Array.isArray(repaired.nodes)) {
    let roundedCoords = false;
    let removedDuplicates = false;
    
    const seenNodeIds = new Set<string>();
    const uniqueNodes = [];

    const repairedNodes = repaired.nodes.map(node => {
      if (typeof node !== 'object' || node === null) return node;
      
      const n = { ...node } as Record<string, unknown>;
      if (typeof n.x === 'number' && !Number.isInteger(n.x)) {
        n.x = Math.round(n.x);
        roundedCoords = true;
      }
      if (typeof n.y === 'number' && !Number.isInteger(n.y)) {
        n.y = Math.round(n.y);
        roundedCoords = true;
      }
      return n;
    });

    for (const node of repairedNodes) {
      if (typeof node === 'object' && node !== null && 'id' in node) {
        const id = String(node.id);
        if (seenNodeIds.has(id)) {
          removedDuplicates = true;
        } else {
          seenNodeIds.add(id);
          uniqueNodes.push(node);
        }
      } else {
        uniqueNodes.push(node);
      }
    }

    if (roundedCoords) {
      warnings.push({ code: 'FLOAT_COORD_ROUNDED', message: 'Float coordinates were rounded to integers' });
    }
    
    if (removedDuplicates) {
      warnings.push({ code: 'DUPLICATE_NODE_REMOVED', message: 'Duplicate node IDs were removed' });
    }
    
    repaired.nodes = uniqueNodes;
  }

  return { repaired, warnings };
}
