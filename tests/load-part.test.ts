import { describe, expect, it, vi } from 'vitest';
import { LOAD_FAILED_MESSAGE, loadPart } from '../src/utils/load-part';

const quiet = { warn: vi.fn(), error: vi.fn() };
const noWait = () => Promise.resolve();

describe('loadPart', () => {
  it('returns the module when it loads the first time', async () => {
    const load = vi.fn().mockResolvedValue({ ok: true });
    await expect(loadPart(load, { wait: noWait, log: quiet })).resolves.toEqual({ ok: true });
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('tries once more after a pause when the first load fails', async () => {
    const load = vi.fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch dynamically imported module'))
      .mockResolvedValueOnce({ ok: true });
    const wait = vi.fn(noWait);

    await expect(loadPart(load, { wait, retryDelayMs: 1500, log: quiet })).resolves.toEqual({ ok: true });
    expect(load).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenCalledWith(1500);
  });

  it('explains what to do when the second load fails too', async () => {
    const load = vi.fn().mockRejectedValue(new TypeError('Failed to fetch dynamically imported module'));

    await expect(loadPart(load, { wait: noWait, log: quiet })).rejects.toThrow(LOAD_FAILED_MESSAGE);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('uses plain characters in the message', () => {
    expect(LOAD_FAILED_MESSAGE).not.toMatch(/[–—‘’“”]/);
  });
});
