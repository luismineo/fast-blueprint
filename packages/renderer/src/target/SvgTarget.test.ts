import { describe, expect, it } from 'vitest'
import { SvgTarget } from './SvgTarget'

describe('SvgTarget', () => {
  it('produces valid SVG wrapper', () => {
    const target = new SvgTarget()
    const svg = target.toSvg(800, 600)
    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"')
    expect(svg).toContain('width="800"')
    expect(svg).toContain('height="600"')
    expect(svg).toContain('</svg>')
  })

  it('clear emits background rect', () => {
    const target = new SvgTarget()
    target.clear('#FBFBF9')
    const svg = target.toSvg(800, 600)
    expect(svg).toContain('<rect width="100%" height="100%" fill="#FBFBF9"/>')
  })

  it('line emits SVG line element', () => {
    const target = new SvgTarget()
    target.line(0, 0, 100, 200, { color: '#000', width: 2 })
    const svg = target.toSvg(800, 600)
    expect(svg).toContain('<line x1="0" y1="0" x2="100" y2="200"')
    expect(svg).toContain('stroke="#000"')
    expect(svg).toContain('stroke-width="2"')
  })

  it('line with dash emits stroke-dasharray', () => {
    const target = new SvgTarget()
    target.line(0, 0, 100, 0, { color: '#000', width: 1, dash: [4, 2] })
    const svg = target.toSvg(800, 600)
    expect(svg).toContain('stroke-dasharray="4 2"')
  })

  it('line with opacity emits opacity attribute', () => {
    const target = new SvgTarget()
    target.line(0, 0, 100, 0, { color: '#000', width: 1, opacity: 0.5 })
    const svg = target.toSvg(800, 600)
    expect(svg).toContain('opacity="0.5"')
  })

  it('polyline emits SVG polyline', () => {
    const target = new SvgTarget()
    const points = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 50 }]
    target.polyline(points, { color: '#111', width: 1.5 })
    const svg = target.toSvg(800, 600)
    expect(svg).toContain('<polyline points="0,0 100,0 100,50"')
    expect(svg).toContain('stroke="#111"')
  })

  it('polyline respects count parameter', () => {
    const target = new SvgTarget()
    const points = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 200, y: 0 }]
    target.polyline(points, { color: '#000', width: 1 }, 2)
    const svg = target.toSvg(800, 600)
    expect(svg).toContain('points="0,0 100,0"')
    expect(svg).not.toContain('points="0,0 100,0 200,0"')
  })

  it('polyline with count < 2 emits nothing', () => {
    const target = new SvgTarget()
    target.polyline([{ x: 0, y: 0 }], { color: '#000', width: 1 }, 1)
    const svg = target.toSvg(800, 600)
    expect(svg).not.toContain('<polyline')
  })

  it('filledPolygon emits SVG polygon', () => {
    const target = new SvgTarget()
    const points = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }]
    target.filledPolygon(points, { color: '#FF0000' })
    const svg = target.toSvg(800, 600)
    expect(svg).toContain('<polygon points="0,0 100,0 100,100 0,100"')
    expect(svg).toContain('fill="#FF0000"')
    expect(svg).toContain('stroke="none"')
  })

  it('filledPolygon with opacity emits opacity attribute', () => {
    const target = new SvgTarget()
    const points = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }]
    target.filledPolygon(points, { color: '#00F', opacity: 0.3 })
    const svg = target.toSvg(800, 600)
    expect(svg).toContain('opacity="0.3"')
  })

  it('text emits SVG text element with selectable content (05-7)', () => {
    const target = new SvgTarget()
    target.text(50, 100, 'Quarto L', { color: '#333', font: '13px Inter' })
    const svg = target.toSvg(800, 600)
    expect(svg).toContain('<text')
    expect(svg).toContain('>Quarto L</text>')
    expect(svg).toContain('fill="#333"')
  })

  it('text escapes special XML characters', () => {
    const target = new SvgTarget()
    target.text(0, 0, '8,00 m² <test>', { color: '#000', font: '12px sans' })
    const svg = target.toSvg(800, 600)
    expect(svg).toContain('8,00 m² &lt;test&gt;')
  })

  it('text with align=center emits text-anchor=middle', () => {
    const target = new SvgTarget()
    target.text(50, 50, 'centered', { color: '#000', font: '12px sans', align: 'center' })
    const svg = target.toSvg(800, 600)
    expect(svg).toContain('text-anchor="middle"')
  })

  it('text with align=right emits text-anchor=end', () => {
    const target = new SvgTarget()
    target.text(50, 50, 'right', { color: '#000', font: '12px sans', align: 'right' })
    const svg = target.toSvg(800, 600)
    expect(svg).toContain('text-anchor="end"')
  })

  it('textRotated emits rotated text element', () => {
    const target = new SvgTarget()
    target.textRotated(100, 200, '3,20 m', Math.PI / 4, { color: '#888', font: '11px mono' })
    const svg = target.toSvg(800, 600)
    expect(svg).toContain('<text')
    expect(svg).toContain('>3,20 m</text>')
    expect(svg).toContain('translate(100,200)')
    expect(svg).toContain('rotate(45')
  })

  it('setWorldTransform wraps elements in transformed group', () => {
    const target = new SvgTarget()
    target.setWorldTransform({ scale: 0.5, tx: 10, ty: 20 })
    target.line(0, 0, 100, 0, { color: '#000', width: 1 })
    const svg = target.toSvg(800, 600)
    expect(svg).toContain('<g transform="matrix(0.5,0,0,0.5,10,20)">')
    expect(svg).toContain('</g>')
  })

  it('resetTransform closes world group', () => {
    const target = new SvgTarget()
    target.setWorldTransform({ scale: 1, tx: 0, ty: 0 })
    target.line(0, 0, 50, 50, { color: '#000', width: 1 })
    target.resetTransform()
    target.text(10, 10, 'UI', { color: '#000', font: '12px sans' })
    const svg = target.toSvg(800, 600)
    const groupEnd = svg.indexOf('</g>')
    const textPos = svg.indexOf('>UI</text>')
    expect(groupEnd).toBeLessThan(textPos)
  })

  it('supports custom viewBox', () => {
    const target = new SvgTarget()
    const svg = target.toSvg(800, 600, '0 0 1000 800')
    expect(svg).toContain('viewBox="0 0 1000 800"')
  })
})
