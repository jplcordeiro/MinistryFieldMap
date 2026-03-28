import React from 'react';
import { render, screen } from '@testing-library/react-native';
import ProfileScreen from '../profile';

const mockSignOut = jest.fn();

jest.mock('../../../lib/auth-context', () => ({
  useAuth: jest.fn().mockReturnValue({
    session: { user: { email: 'test@example.com', id: '1' } },
    signOut: mockSignOut,
  }),
}));

describe('ProfileScreen', () => {
  it('renders user email', () => {
    render(<ProfileScreen />);
    expect(screen.getByText('test@example.com')).toBeTruthy();
  });

  it('renders logout button', () => {
    render(<ProfileScreen />);
    expect(screen.getByText('Sair')).toBeTruthy();
  });
});
