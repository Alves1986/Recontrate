import { createAuthClient } from '@neon/auth';
import { BetterAuthReactAdapter } from '@neon/auth/react/adapters';
import { createRealtimeClient, type SealedLiveQuery } from '@neon/realtime/client';
import { drizzleParsers } from '@neon/realtime-drizzle/client';

const authUrl =
  import.meta.env.VITE_NEON_AUTH_URL ||
  'https://ep-small-bread-bdnj9nge.neonauth.c-8.us-east-2.aws.neon.tech/neondb/auth';

const realtimeUrl =
  import.meta.env.VITE_NEON_REALTIME_URL ||
  'https://ep-small-bread-bdnj9nge.rt.c-8.us-east-2.aws.neon.tech/';

export const authClient = createAuthClient(authUrl, {
  adapter: BetterAuthReactAdapter(),
});

export const realtimeClient = createRealtimeClient({
  url: realtimeUrl,
  parsers: { ...drizzleParsers },
});

export interface LiveNotificationItem {
  id: string;
  provider_id: string;
  type: string;
  title: string;
  message: string;
  client_name: string;
  neighborhood: string;
  urgency_or_scope: string;
  read: boolean;
  created_at: Date | string;
}

export async function fetchSealedProviderNotifications(
  providerId = 'prov-joao'
): Promise<SealedLiveQuery<LiveNotificationItem>> {
  const res = await fetch('/api/neon/realtime/seal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ providerId }),
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch sealed query (${res.status})`);
  }
  return (await res.json()) as SealedLiveQuery<LiveNotificationItem>;
}
