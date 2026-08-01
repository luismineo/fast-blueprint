import type {
  Degrees,
  FurnitureId,
  Millimeters,
  NodeId,
  OpeningId,
  RoomId,
  WallId,
} from '../model';

/**
 * Construtores de tipos branded para uso em teste.
 *
 * Os ids e as unidades do domínio são branded types (`NodeId`, `Millimeters`,
 * …) que em runtime são apenas string/number. Testes precisam produzir valores
 * literais; sem estes helpers cada teste escreve `'n1' as any`, o que desliga
 * a checagem de tipo justamente onde ela pegaria um id no campo errado.
 */

export const nodeId = (value: string): NodeId => value as NodeId;
export const roomId = (value: string): RoomId => value as RoomId;
export const wallId = (value: string): WallId => value as WallId;
export const openingId = (value: string): OpeningId => value as OpeningId;
export const furnitureId = (value: string): FurnitureId => value as FurnitureId;
export const mm = (value: number): Millimeters => value as Millimeters;
export const deg = (value: number): Degrees => value as Degrees;
