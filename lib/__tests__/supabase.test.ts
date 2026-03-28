import { TERRITORY_STATUS_COLORS, ADDRESS_STATUS_COLORS } from '../types';

describe('TERRITORY_STATUS_COLORS', () => {
  it('has a color for every status', () => {
    expect(TERRITORY_STATUS_COLORS.available).toBeDefined();
    expect(TERRITORY_STATUS_COLORS.in_use).toBeDefined();
    expect(TERRITORY_STATUS_COLORS.completed).toBeDefined();
  });
});

describe('ADDRESS_STATUS_COLORS', () => {
  it('has a color for every status', () => {
    expect(ADDRESS_STATUS_COLORS.not_visited).toBeDefined();
    expect(ADDRESS_STATUS_COLORS.visited).toBeDefined();
    expect(ADDRESS_STATUS_COLORS.no_contact).toBeDefined();
  });
});
