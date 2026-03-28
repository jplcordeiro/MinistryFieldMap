export type TerritoryStatus = 'available' | 'in_use' | 'completed';
export type AddressStatus = 'not_visited' | 'visited' | 'no_contact';

export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}

export interface Territory {
  id: string;
  name: string;
  coordinates: GeoJSONPolygon;
  status: TerritoryStatus;
  created_at: string;
}

export interface Address {
  id: string;
  territory_id: string;
  lat: number;
  lng: number;
  status: AddressStatus;
  notes: string | null;
  visited_at: string | null;
  visited_by: string | null;
}

export const TERRITORY_STATUS_COLORS: Record<TerritoryStatus, string> = {
  available: '#22c55e',   // green-500
  in_use: '#eab308',      // yellow-500
  completed: '#9ca3af',   // gray-400
};

export const ADDRESS_STATUS_COLORS: Record<AddressStatus, string> = {
  not_visited: '#3b82f6', // blue-500
  visited: '#22c55e',     // green-500
  no_contact: '#ef4444',  // red-500
};
