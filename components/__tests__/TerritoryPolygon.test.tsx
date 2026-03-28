import React from 'react';
import { render } from '@testing-library/react-native';
import { TerritoryPolygon } from '../TerritoryPolygon';
import { TERRITORY_STATUS_COLORS } from '../../lib/types';

jest.mock('react-native-maps', () => {
  const { View } = require('react-native');
  return {
    Polygon: (props: any) => <View testID="polygon" {...props} />,
  };
});

const coords = [
  { latitude: -23.545, longitude: -46.635 },
  { latitude: -23.540, longitude: -46.635 },
  { latitude: -23.540, longitude: -46.630 },
];

describe('TerritoryPolygon', () => {
  it('renders with correct fill color for available status', () => {
    const { getByTestId } = render(
      <TerritoryPolygon coordinates={coords} status="available" onPress={() => {}} />
    );
    const polygon = getByTestId('polygon');
    expect(polygon.props.fillColor).toBe(TERRITORY_STATUS_COLORS.available + '80');
  });

  it('renders with correct fill color for in_use status', () => {
    const { getByTestId } = render(
      <TerritoryPolygon coordinates={coords} status="in_use" onPress={() => {}} />
    );
    const polygon = getByTestId('polygon');
    expect(polygon.props.fillColor).toBe(TERRITORY_STATUS_COLORS.in_use + '80');
  });
});
