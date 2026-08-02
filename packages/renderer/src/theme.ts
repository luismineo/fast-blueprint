export interface Theme {
  readonly background: string
  readonly grid: string
  readonly gridMajor: string
  readonly wall: string
  readonly wallWidth: number
  readonly roomFill: string
  readonly roomFillAlt: string
  readonly roomLabel: string
  readonly dimension: string
  readonly dimensionWidth: number
  readonly furnitureFill: string
  readonly furnitureStroke: string
  readonly furnitureLabel: string
  readonly clearance: string
  readonly selection: string
  readonly selectionFill: string
  readonly snapGuide: string
  readonly snapNode: string
  readonly glyph: string
  readonly collision: string
  readonly outsideRoom: string
}

export const lightTheme: Theme = {
  background: '#FBFBF9',
  grid: '#E8E7E2',
  gridMajor: '#D8D6CF',
  wall: '#1C1B18',
  wallWidth: 2.5,
  roomFill: '#FFFFFF',
  roomFillAlt: '#F4F3EF',
  roomLabel: '#57544C',
  dimension: '#8B877C',
  dimensionWidth: 1,
  furnitureFill: '#E4E9EE',
  furnitureStroke: '#7C8894',
  furnitureLabel: '#4A545F',
  clearance: '#DCE6DA',
  selection: '#2F6FED',
  selectionFill: 'rgba(47,111,237,0.10)',
  snapGuide: '#E0645A',
  snapNode: '#2F6FED',
  glyph: '#5B6775',
  collision: '#D4735E',
  outsideRoom: '#B9B4A8',
}
