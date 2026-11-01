import { getAccessToken, signOut } from '../auth/supabaseAuth.js';

export interface ApiFetchInit extends RequestInit {
  timeoutMs?: number;
}

export async function apiFetch(input: RequestInfo | URL, init: ApiFetchInit = {}): Promise<Response> {
  const { timeoutMs, ...requestInit } = init;
  const controller = new AbortController();
  const callerSignal = requestInit.signal;
  let timedOut = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const abortFromCaller = () => controller.abort(callerSignal?.reason);
  if (callerSignal?.aborted) abortFromCaller();
  else callerSignal?.addEventListener('abort', abortFromCaller, { once: true });

  const request = async (): Promise<Response> => {
    const headers = new Headers(requestInit.headers);
    const accessToken = await getAccessToken();
    if (controller.signal.aborted) throw controller.signal.reason || new DOMException('Request aborted.', 'AbortError');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
    const response = await fetch(input, { ...requestInit, headers, signal: controller.signal });
    if (response.status === 401 && typeof input === 'string' && input.startsWith('/api/')) await signOut();
    return response;
  };

  try {
    if (!timeoutMs || timeoutMs <= 0) return await request();
    return await Promise.race([
      request(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          timedOut = true;
          controller.abort();
          reject(new DOMException(`Request timed out after ${timeoutMs}ms.`, 'TimeoutError'));
        }, timeoutMs);
      }),
    ]);
  } catch (error) {
    if (timedOut) throw new DOMException(`Request timed out after ${timeoutMs}ms.`, 'TimeoutError');
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
    callerSignal?.removeEventListener('abort', abortFromCaller);
  }
}
