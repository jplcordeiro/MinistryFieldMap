import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { VisitModal } from '../VisitModal';

const mockAddress = {
  id: 'addr-1',
  territory_id: 'terr-1',
  lat: -23.542,
  lng: -46.633,
  status: 'not_visited' as const,
  notes: null,
  visited_at: null,
  visited_by: null,
};

describe('VisitModal', () => {
  it('renders address status options', () => {
    render(
      <VisitModal
        visible={true}
        address={mockAddress}
        onClose={() => {}}
        onSave={() => Promise.resolve()}
      />
    );
    expect(screen.getByText('Visitado')).toBeTruthy();
    expect(screen.getByText('Sem contato')).toBeTruthy();
    expect(screen.getByText('Não visitado')).toBeTruthy();
  });

  it('calls onClose when cancel is pressed', () => {
    const onClose = jest.fn();
    render(
      <VisitModal
        visible={true}
        address={mockAddress}
        onClose={onClose}
        onSave={() => Promise.resolve()}
      />
    );
    fireEvent.press(screen.getByText('Cancelar'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
