import type { Api } from '../../preload/index';
import type { StrataGitApi } from '../../shared/types';

export const api = (window as unknown as { api: Api & StrataGitApi }).api;

/** Unwrap the {__error} envelope produced by main-process handlers. */
export async function unwrap<T>(p: Promise<T>): Promise<T> {
  const res = await p;
  if (res && typeof res === 'object' && '__error' in (res as Record<string, unknown>)) {
    throw new Error(String((res as Record<string, unknown>)['__error']));
  }
  return res;
}
