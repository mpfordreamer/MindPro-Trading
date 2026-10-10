import 'server-only';
export type SendResult = { ok: true } | { ok: false; permanent: boolean; reason: string };

/** fetch dengan timeout & tanpa mengikuti redirect (cegah pengalihan ke host lain). */
export const safeFetch = (url: string, init: RequestInit = {}) => fetch(url, { ...init, redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(8000) });
