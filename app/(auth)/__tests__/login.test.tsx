import React from 'react';
import { render, screen } from '@testing-library/react-native';
import LoginScreen from '../login';

jest.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithIdToken: jest.fn(),
    },
  },
}));

jest.mock('expo-auth-session/providers/google', () => ({
  useAuthRequest: jest.fn().mockReturnValue([null, null, jest.fn()]),
}));

jest.mock('@invertase/react-native-apple-authentication', () => ({
  appleAuth: {
    performRequest: jest.fn(),
    Operation: { LOGIN: 0 },
    Scope: { FULL_NAME: 0, EMAIL: 1 },
  },
}));

describe('LoginScreen', () => {
  it('renders login title', () => {
    render(<LoginScreen />);
    expect(screen.getByText('Ministry Field Map')).toBeTruthy();
  });

  it('renders Google sign-in button', () => {
    render(<LoginScreen />);
    expect(screen.getByText('Entrar com Google')).toBeTruthy();
  });
});
