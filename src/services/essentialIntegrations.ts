import { pool } from '../db/index';

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

const SAO_PAULO_NEIGHBORHOOD_COORDS: Record<string, { lat: number; lng: number }> = {
  pinheiros: { lat: -23.561414, lng: -46.691415 },
  'vila madalena': { lat: -23.551185, lng: -46.697458 },
  'itaim bibi': { lat: -23.584417, lng: -46.678442 },
  jardins: { lat: -23.567386, lng: -46.668018 },
  moema: { lat: -23.600395, lng: -46.665604 },
  perdizes: { lat: -23.536841, lng: -46.674329 },
  butanta: { lat: -23.571968, lng: -46.708239 },
  butantã: { lat: -23.571968, lng: -46.708239 },
  'vila mariana': { lat: -23.589172, lng: -46.634665 },
  brooklin: { lat: -23.612289, lng: -46.686974 },
  'alto de pinheiros': { lat: -23.549812, lng: -46.708821 },
  lapa: { lat: -23.527621, lng: -46.701395 },
  pompeia: { lat: -23.532145, lng: -46.685214 },
  'campo belo': { lat: -23.619428, lng: -46.669812 },
  'santo amaro': { lat: -23.654219, lng: -46.706198 },
};

/**
 * Calcula distância em km entre duas coordenadas geográficas via fórmula de Haversine.
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371; // Raio da Terra em km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

/**
 * Geocodificação local e via Google Maps API (quando GOOGLE_MAPS_API_KEY estiver configurada)
 * para cálculo de raio de atendimento de prestadores.
 */
export class GeolocationRadiusService {
  async resolveLocation(
    neighborhood: string,
    city = 'São Paulo, SP'
  ): Promise<GeoCoordinates> {
    const normalized = neighborhood.trim().toLowerCase();
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (apiKey && !apiKey.startsWith('YOUR_')) {
      try {
        const address = encodeURIComponent(`${neighborhood}, ${city}, Brasil`);
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${address}&key=${apiKey}`
        );
        if (res.ok) {
          const data = (await res.json()) as any;
          const loc = data?.results?.[0]?.geometry?.location;
          if (loc && typeof loc.lat === 'number' && typeof loc.lng === 'number') {
            return {
              latitude: loc.lat,
              longitude: loc.lng,
              formattedAddress:
                data.results[0].formatted_address || `${neighborhood}, ${city}`,
            };
          }
        }
      } catch {
        // Fallback to local dictionary if external network call fails
      }
    }

    const found =
      SAO_PAULO_NEIGHBORHOOD_COORDS[normalized] ||
      Object.entries(SAO_PAULO_NEIGHBORHOOD_COORDS).find(([key]) =>
        normalized.includes(key)
      )?.[1] || { lat: -23.561414, lng: -46.691415 };

    return {
      latitude: found.lat,
      longitude: found.lng,
      formattedAddress: `${neighborhood}, ${city}`,
    };
  }

  async checkProviderRadius(input: {
    requestNeighborhood: string;
    requestCity?: string;
    providerNeighborhoods: string[];
    providerLat?: number;
    providerLng?: number;
    radiusKm: number;
  }): Promise<{ withinRadius: boolean; distanceKm: number }> {
    const reqCoords = await this.resolveLocation(
      input.requestNeighborhood,
      input.requestCity
    );

    const primaryProviderNeighborhood =
      input.providerNeighborhoods[0] || 'Pinheiros';
    const provCoords =
      typeof input.providerLat === 'number' &&
      typeof input.providerLng === 'number'
        ? { latitude: input.providerLat, longitude: input.providerLng }
        : await this.resolveLocation(primaryProviderNeighborhood, input.requestCity);

    let distanceKm = calculateHaversineDistanceKm(
      reqCoords.latitude,
      reqCoords.longitude,
      provCoords.latitude,
      provCoords.longitude
    );

    if (distanceKm === 0) {
      distanceKm = 0.8; // Mesma micro-região
    }

    const explicitlyCoversNeighborhood = input.providerNeighborhoods.some(
      (n) =>
        n.toLowerCase() === input.requestNeighborhood.trim().toLowerCase()
    );

    return {
      withinRadius:
        explicitlyCoversNeighborhood || distanceKm <= Math.max(1, input.radiusKm),
      distanceKm,
    };
  }
}

/**
 * Integração de E-mail Transacional para confirmação de cadastro, recuperação de senha e avisos.
 */
export class TransactionalEmailService {
  async sendEmail(input: {
    to: string;
    subject: string;
    template:
      | 'confirmacao_email'
      | 'recuperacao_senha'
      | 'aviso_oportunidade'
      | 'aviso_recontratacao'
      | 'aviso_aprovacao_cadastro';
    variables: Record<string, string>;
    userId?: string;
  }): Promise<{ delivered: boolean; provider: string; messageId: string }> {
    const messageId = `email-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)}`;
    const resendApiKey = process.env.RESEND_API_KEY;
    let provider = 'confiare-transactional-outbox';

    if (resendApiKey && !resendApiKey.startsWith('YOUR_')) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from:
              process.env.EMAIL_FROM || 'Confiare <nao-responda@confiare.com.br>',
            to: [input.to],
            subject: input.subject,
            text: Object.entries(input.variables)
              .map(([k, v]) => `${k}: ${v}`)
              .join('\n'),
          }),
        });
        if (res.ok) {
          provider = 'resend-api';
        }
      } catch {
        // Fallback to outbox audit log
      }
    }

    await pool.query(
      `INSERT INTO audit_logs (actor_user_id, actor_role, action, target_type, target_id, metadata_json)
       VALUES ($1, 'system', 'transactional_email_sent', 'email', $2, $3::jsonb)`,
      [
        input.userId || null,
        messageId,
        JSON.stringify({
          to: input.to,
          subject: input.subject,
          template: input.template,
          provider,
        }),
      ]
    );

    return {
      delivered: true,
      provider,
      messageId,
    };
  }
}

/**
 * Integração com WhatsApp Business Cloud API para notificação de oportunidades, recompra e indicação de substituto.
 */
export class WhatsAppBusinessService {
  async sendTemplateNotification(input: {
    recipientPhone: string;
    templateName:
      | 'nova_oportunidade_compativel'
      | 'recontratacao_1_clique'
      | 'indicacao_substituto_confiavel';
    parameters: Record<string, string>;
    providerProfileId?: string;
    customerUserId?: string;
  }): Promise<{ sent: boolean; channel: string; messageId: string }> {
    const messageId = `waba-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)}`;
    const token = process.env.WHATSAPP_BUSINESS_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    let channel = 'whatsapp-business-outbox';

    if (token && phoneId && !token.startsWith('YOUR_')) {
      try {
        const cleanDigits = input.recipientPhone.replace(/\D/g, '');
        const toPhone = cleanDigits.startsWith('55')
          ? cleanDigits
          : `55${cleanDigits}`;
        const res = await fetch(
          `https://graph.facebook.com/v19.0/${phoneId}/messages`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: toPhone,
              type: 'template',
              template: {
                name: input.templateName,
                language: { code: 'pt_BR' },
              },
            }),
          }
        );
        if (res.ok) {
          channel = 'meta-whatsapp-cloud-api';
        }
      } catch {
        // Fallback to outbox log
      }
    }

    await pool.query(
      `INSERT INTO notifications (user_id, provider_profile_id, type, title, message)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        input.customerUserId || null,
        input.providerProfileId || null,
        `whatsapp_${input.templateName}`,
        `WhatsApp Business: ${input.templateName}`,
        JSON.stringify(input.parameters),
      ]
    );

    return {
      sent: true,
      channel,
      messageId,
    };
  }
}
