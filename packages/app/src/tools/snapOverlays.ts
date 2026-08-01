import type { OverlayPrimitive, SnapTarget } from '@planta/core'

/**
 * Guias visuais derivadas de `SnapResult.targets`
 * (`02-unidades-e-geometria.md` § Guias visuais).
 *
 * O resolvedor já devolve a geometria de cada restrição que participou; aqui
 * só se escolhe o papel semântico. Redescobrir a aresta ou o nó de referência
 * a partir do documento daria a chance de a guia discordar do ponto resolvido.
 */
export function snapOverlays(targets: readonly SnapTarget[]): OverlayPrimitive[] {
  const overlays: OverlayPrimitive[] = []

  for (const target of targets) {
    switch (target.kind) {
      case 'node':
        overlays.push({ kind: 'marker', role: 'snapNode', position: target.at })
        break
      case 'midpoint':
        overlays.push({ kind: 'marker', role: 'midpoint', position: target.at })
        break
      case 'axis':
        overlays.push({ kind: 'segment', role: 'axisGuide', a: target.from, b: target.to })
        break
      case 'alignment':
        overlays.push({
          kind: 'segment',
          role: 'alignmentGuide',
          a: target.from,
          b: target.to,
        })
        break
      case 'edge':
      case 'extension':
        overlays.push({ kind: 'segment', role: 'edgeHighlight', a: target.a, b: target.b })
        break
    }
  }

  return overlays
}
