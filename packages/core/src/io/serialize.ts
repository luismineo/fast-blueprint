import type { PlanDocument, NodeId } from '../model/types';

export function serializeDocument(doc: PlanDocument, appVersion: string): string {
  const serialized = {
    ...JSON.parse(JSON.stringify(doc)),
    meta: { ...(doc.meta as unknown as Record<string, unknown>), appVersion, modifiedAt: new Date().toISOString() },
  } as PlanDocument;

  const referencedNodeIds = new Set<string>();
  for (const room of serialized.rooms) {
    for (const nodeId of room.loop) {
      referencedNodeIds.add(nodeId);
    }
  }
  for (const wall of serialized.walls) {
    referencedNodeIds.add(wall.a);
    referencedNodeIds.add(wall.b);
  }

  serialized.nodes = serialized.nodes.filter((node) => referencedNodeIds.has(node.id));

  return JSON.stringify(serialized, null, 2);
}
