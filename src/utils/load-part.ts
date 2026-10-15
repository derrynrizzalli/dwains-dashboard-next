/**
 * Shown by Home Assistant when the dashboard files cannot be loaded, for
 * example after an update while the browser still uses old cached files. Not
 * translated on purpose: the translations are part of the files that failed.
 */
export const LOAD_FAILED_MESSAGE =
  'Dwains Dashboard Next could not load its files. Refresh the page or clear the browser cache. ' +
  'If you installed it by hand, also copy the chunks folder next to dwains-dashboard-next.js.';

export const LOAD_RETRY_DELAY_MS = 1500;

export interface LoadPartOptions {
  retryDelayMs?: number;
  wait?: (ms: number) => Promise<void>;
  log?: Pick<Console, 'warn' | 'error'>;
}

const defaultWait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Load a part of the dashboard. A failed load is tried once more after a
 * short pause (a network hiccup on a wall tablet); when that fails too, the
 * error explains what to do instead of the browser's own message.
 */
export async function loadPart<T>(load: () => Promise<T>, options: LoadPartOptions = {}): Promise<T> {
  const { retryDelayMs = LOAD_RETRY_DELAY_MS, wait = defaultWait, log = console } = options;
  try {
    return await load();
  } catch (firstError) {
    log.warn('Dwains Dashboard Next - Loading failed, trying again', firstError);
    await wait(retryDelayMs);
    try {
      return await load();
    } catch (error) {
      log.error('Dwains Dashboard Next - Failed to load', error);
      throw new Error(LOAD_FAILED_MESSAGE);
    }
  }
}
