import React from 'react';
import { Polygon } from 'react-native-maps';
import { TerritoryStatus, TERRITORY_STATUS_COLORS } from '../lib/types';

interface Props {
  coordinates: { latitude: number; longitude: number }[];
  status: TerritoryStatus;
  onPress: () => void;
}

export function TerritoryPolygon({ coordinates, status, onPress }: Props) {
  const color = TERRITORY_STATUS_COLORS[status];
  return (
    <Polygon
      coordinates={coordinates}
      fillColor={`${color}80`}
      strokeColor={color}
      strokeWidth={2}
      tappable
      onPress={onPress}
    />
  );
}
