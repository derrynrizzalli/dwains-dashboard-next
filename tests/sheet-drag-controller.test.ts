import { describe, expect, it } from 'vitest';
import { canStartDrag, shouldCloseSheet } from '../src/utils/sheet-drag-controller';

describe('sheet drag', () => {
  it('starts a drag after a downward pull of more than 8px', () => {
    expect(canStartDrag({ deltaX: 0, deltaY: 8, onControl: false, contentScrolled: false })).toBe(false);
    expect(canStartDrag({ deltaX: 2, deltaY: 9, onControl: false, contentScrolled: false })).toBe(true);
  });

  it('does not start on upward or sideways movement', () => {
    expect(canStartDrag({ deltaX: 0, deltaY: -20, onControl: false, contentScrolled: false })).toBe(false);
    expect(canStartDrag({ deltaX: 30, deltaY: 12, onControl: false, contentScrolled: false })).toBe(false);
  });

  it('does not start on controls or scrolled content', () => {
    expect(canStartDrag({ deltaX: 0, deltaY: 40, onControl: true, contentScrolled: false })).toBe(false);
    expect(canStartDrag({ deltaX: 0, deltaY: 40, onControl: false, contentScrolled: true })).toBe(false);
  });

  it('closes past 120px or a quarter of the sheet', () => {
    expect(shouldCloseSheet(121, 800)).toBe(true);
    expect(shouldCloseSheet(119, 800)).toBe(false);
    // A quarter of a 300px sheet is 75px.
    expect(shouldCloseSheet(80, 300)).toBe(true);
    expect(shouldCloseSheet(70, 300)).toBe(false);
  });

  it('never closes without a downward offset', () => {
    expect(shouldCloseSheet(0, 300)).toBe(false);
    expect(shouldCloseSheet(-50, 300)).toBe(false);
    expect(shouldCloseSheet(Number.NaN, 300)).toBe(false);
  });
});
