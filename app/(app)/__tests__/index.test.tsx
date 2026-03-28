import React from 'react';
import { render, screen } from '@testing-library/react-native';
import MainMapScreen from '../index';

jest.mock('../../../lib/auth-context', () => ({
  useAuth: jest.fn().mockReturnValue({ session: { user: { id: '1' } }, signOut: jest.fn() }),
}));

jest.mock('../../../lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue({ data: [], error: null }),
    }),
  },
}));

jest.mock('react-native-maps', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: any) => <View testID="map" {...props} />,
    Polygon: (props: any) => <View testID="polygon" {...props} />,
  };
});

describe('MainMapScreen', () => {
  it('renders the map', async () => {
    render(<MainMapScreen />);
    expect(screen.getByTestId('map')).toBeTruthy();
  });

  it('renders profile button', () => {
    render(<MainMapScreen />);
    expect(screen.getByTestId('profile-button')).toBeTruthy();
  });
});
