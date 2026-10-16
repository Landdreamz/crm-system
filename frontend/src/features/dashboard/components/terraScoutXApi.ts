const TSX_API_BASE = 'https://api.terrascoutx.com';

export const TERRA_SCOUT_X_API_KEY_STORAGE = 'terraScoutXApiKey';

export type TerraScoutXProperty = Record<string, unknown> & {
  id?: string;
  parcelId?: string;
  address?: string;
  totalAppraised?: number | string;
  landValue?: number | string;
  improvementValue?: number | string;
  acres?: number | string;
  squareFeet?: number | string;
};

function authHeaders(apiKey: string): HeadersInit {
  return {
    'X-Api-Key': apiKey,
    Accept: 'application/json',
  };
}

async function parseError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (body && typeof body === 'object') {
      const msg = (body as { message?: string; error?: string }).message ?? (body as { error?: string }).error;
      if (msg) return String(msg);
    }
  } catch {
    /* ignore */
  }
  if (res.status === 401) return 'Invalid or missing API key.';
  if (res.status === 429) return 'Rate limit exceeded. Try again in a moment.';
  return `Request failed (${res.status})`;
}

export async function suggestProperties(
  query: string,
  apiKey: string,
  options?: { noOwner?: boolean }
): Promise<TerraScoutXProperty[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return [];
  }
  const params = new URLSearchParams({ q: trimmed });
  if (options?.noOwner) params.set('no_owner', '1');

  const res = await fetch(`${TSX_API_BASE}/v1/suggest?${params.toString()}`, {
    method: 'GET',
    headers: authHeaders(apiKey),
  });

  if (!res.ok) {
    throw new Error(await parseError(res));
  }

  const data = await res.json();
  if (Array.isArray(data)) return data as TerraScoutXProperty[];
  if (data && Array.isArray((data as { results?: unknown }).results)) {
    return (data as { results: TerraScoutXProperty[] }).results;
  }
  if (data && Array.isArray((data as { data?: unknown }).data)) {
    return (data as { data: TerraScoutXProperty[] }).data;
  }
  return [];
}

export async function getPropertyById(
  id: string,
  apiKey: string,
  options?: { noOwner?: boolean }
): Promise<TerraScoutXProperty> {
  const params = new URLSearchParams();
  if (options?.noOwner) params.set('no_owner', '1');
  const qs = params.toString();
  const url = `${TSX_API_BASE}/v1/property/${encodeURIComponent(id)}${qs ? `?${qs}` : ''}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: authHeaders(apiKey),
  });

  if (!res.ok) {
    throw new Error(await parseError(res));
  }

  return (await res.json()) as TerraScoutXProperty;
}

export function loadStoredApiKey(): string {
  try {
    return localStorage.getItem(TERRA_SCOUT_X_API_KEY_STORAGE) ?? '';
  } catch {
    return '';
  }
}

export function saveStoredApiKey(key: string): void {
  try {
    if (key.trim()) {
      localStorage.setItem(TERRA_SCOUT_X_API_KEY_STORAGE, key.trim());
    } else {
      localStorage.removeItem(TERRA_SCOUT_X_API_KEY_STORAGE);
    }
  } catch {
    /* ignore */
  }
}

export function formatPropertyLabel(p: TerraScoutXProperty): string {
  const addr = p.address ?? (p as { situsAddress?: string }).situsAddress;
  const parcel = p.parcelId ?? p.id;
  if (addr && parcel) return `${addr} (${parcel})`;
  if (addr) return String(addr);
  if (parcel) return String(parcel);
  return 'Property';
}

export function formatMoney(value: unknown): string {
  if (value === undefined || value === null || value === '') return '—';
  const n = typeof value === 'number' ? value : parseFloat(String(value).replace(/,/g, ''));
  if (!Number.isFinite(n)) return String(value);
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}
