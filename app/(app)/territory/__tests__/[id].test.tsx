import React from 'react';
import { render, screen } from '@testing-library/react-native';
import TerritoryScreen from '../[id]';

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn().mockReturnValue({ id: 'terr-1' }),
  useRouter: jest.fn().mockReturnValue({ back: jest.fn() }),
  Stack: { Screen: () => null },
}));

jest.mock('../../../../lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }),
    channel: jest.fn().mockReturnValue({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
    }),
    removeChannel: jest.fn(),
  },
}));

jest.mock('react-native-maps', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: any) => <View testID="map" {...props} />,
    Marker: (props: any) => <View testID="marker" {...props} />,
  };
});

describe('TerritoryScreen', () => {
  it('renders the map', () => {
    render(<TerritoryScreen />);
    expect(screen.getByTestId('map')).toBeTruthy();
  });
});
