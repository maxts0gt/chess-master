import { normalizeEngineScore, isMistake } from '../src/utils/eval';

describe('eval utils', () => {
  test('normalizeEngineScore converts cp to pawns', () => {
    expect(normalizeEngineScore({ type: 'cp', value: 120 })).toBeCloseTo(1.2);
  });

  test('normalizeEngineScore handles mate scores', () => {
    expect(normalizeEngineScore({ type: 'mate', value: 3 })).toBe(100);
    expect(normalizeEngineScore({ type: 'mate', value: -5 })).toBe(-100);
  });

  test('isMistake detects significant drops', () => {
    expect(isMistake(0.5, -0.5, 0.7)).toBe(true);
    expect(isMistake(0.5, 0.0, 0.7)).toBe(false);
  });
});