import React, { useState } from 'react';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  Clock,
  MapPin,
  MessageSquare,
  Radio,
  Sparkles,
  Zap,
} from 'lucide-react';
import {
  ProviderNotificationType,
  ProviderOpportunity,
  ProviderProfile,
  ProviderRealtimeNotification,
} from '../types/confiare';
import {
  createRealtimeNotification,
  filterProviderNotifications,
  markProviderNotificationsRead,
} from '../utils/marketplaceRules';

interface ProviderRealtimeNotificationsProps {
  activeProvider: ProviderProfile;
  notifications: ProviderRealtimeNotification[];
  onUpdateNotifications: React.Dispatch<
    React.SetStateAction<ProviderRealtimeNotification[]>
  >;
  onAddRealtimeOpportunity: (newOpp: ProviderOpportunity) => void;
  onFocusOpportunityTab: () => void;
}

const LIVE_OPPORTUNITY_SAMPLES: {
  title: string;
  description: string;
  neighborhood: string;
  distanceKm: number;
  urgency: ProviderOpportunity['urgency'];
  preferredTime: string;
  clientNameMasked: string;
  clientNameFull: string;
  clientWhatsapp: string;
  origin: ProviderOpportunity['origin'];
}[] = [
  {
    title: 'Substituição de disjuntor DR 40A e revisão de barramento bifásico',
    description:
      'Quadro principal desarmando ao acionar forno elétrico e secadora simultaneamente. Preciso de diagnóstico e adequação técnica.',
    neighborhood: 'Pinheiros',
    distanceKm: 0.9,
    urgency: 'Hoje',
    preferredTime: 'Tarde (13h–18h)',
    clientNameMasked: 'Fernanda L. (Cliente Verificada)',
    clientNameFull: 'Fernanda Lima',
    clientWhatsapp: '(11) 99610-4821',
    origin: 'Matching Local',
  },
  {
    title: 'Instalação de tomada dedicada 20A e proteção DPS no home office',
    description:
      'Adequação de circuito com aterramento revisado para estação de trabalho e nobreak.',
    neighborhood: 'Jardins',
    distanceKm: 1.8,
    urgency: 'Amanhã',
    preferredTime: 'Manhã (08h–12h)',
    clientNameMasked: 'Gustavo M. (Recontratação Direta)',
    clientNameFull: 'Gustavo Martins',
    clientWhatsapp: '(11) 98432-9910',
    origin: 'Recontratação Direta',
  },
];

const LIVE_QUOTE_ACCEPTANCE_SAMPLES: {
  title: string;
  message: string;
  clientName: string;
  neighborhood: string;
  urgencyOrScope: string;
  clientWhatsapp: string;
}[] = [
  {
    title: 'Orçamento aceito pelo cliente em tempo real!',
    message:
      'Mariana Souza aprovou seu orçamento para revisão do disjuntor 32A do chuveiro e tomada 20A da cozinha.',
    clientName: 'Mariana Souza',
    neighborhood: 'Pinheiros',
    urgencyOrScope: 'Escopo aprovado · Visita técnica confirmada para Hoje (14h)',
    clientWhatsapp: '(11) 99204-6612',
  },
  {
    title: 'Aceite de orçamento confirmado via WhatsApp!',
    message:
      'Eduardo Klein confirmou o orçamento para instalação de 4 luminárias de sobrepor e interruptor paralelo.',
    clientName: 'Eduardo Klein',
    neighborhood: 'Vila Madalena',
    urgencyOrScope: 'Escopo aprovado · Atendimento agendado para Amanhã (09h)',
    clientWhatsapp: '(11) 98841-1029',
  },
];

export const ProviderRealtimeNotifications: React.FC<
  ProviderRealtimeNotificationsProps
> = ({
  activeProvider,
  notifications,
  onUpdateNotifications,
  onAddRealtimeOpportunity,
  onFocusOpportunityTab,
}) => {
  const [filterType, setFilterType] = useState<
    'todas' | ProviderNotificationType
  >('todas');
  const [simOppIndex, setSimOppIndex] = useState(0);
  const [simQuoteIndex, setSimQuoteIndex] = useState(0);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const oppNotifCount = notifications.filter(
    (n) => n.type === 'nova_oportunidade'
  ).length;
  const quoteNotifCount = notifications.filter(
    (n) => n.type === 'aceite_orcamento'
  ).length;

  const filteredNotifications = filterProviderNotifications(
    notifications,
    filterType
  );

  const handleSimulateNewOpportunity = () => {
    const sample =
      LIVE_OPPORTUNITY_SAMPLES[simOppIndex % LIVE_OPPORTUNITY_SAMPLES.length];
    setSimOppIndex((prev) => prev + 1);

    const newOppId = `opp-live-${Date.now()}`;
    const newOpp: ProviderOpportunity = {
      id: newOppId,
      category: activeProvider.category,
      title: sample.title,
      description: sample.description,
      neighborhood: sample.neighborhood,
      distanceKm: sample.distanceKm,
      urgency: sample.urgency,
      preferredTime: sample.preferredTime,
      clientNameMasked: sample.clientNameMasked,
      clientNameFull: sample.clientNameFull,
      clientWhatsapp: sample.clientWhatsapp,
      origin: sample.origin,
      photosAttached: 2,
      expiresInMinutes: 30,
      status: 'pendente',
    };

    onAddRealtimeOpportunity(newOpp);

    const newNotif = createRealtimeNotification({
      id: `notif-opp-${Date.now()}`,
      type: 'nova_oportunidade',
      title: `Nova oportunidade · ${sample.origin}`,
      message: sample.title,
      clientName: sample.clientNameMasked,
      neighborhood: `${sample.neighborhood} (${sample.distanceKm} km)`,
      urgencyOrScope: `Urgência: ${sample.urgency} · ${sample.preferredTime}`,
      timestamp: 'Agora mesmo',
      opportunityId: newOppId,
      clientWhatsapp: sample.clientWhatsapp,
    });

    onUpdateNotifications((prev) => [newNotif, ...prev]);
  };

  const handleSimulateQuoteAcceptance = () => {
    const sample =
      LIVE_QUOTE_ACCEPTANCE_SAMPLES[
        simQuoteIndex % LIVE_QUOTE_ACCEPTANCE_SAMPLES.length
      ];
    setSimQuoteIndex((prev) => prev + 1);

    const newNotif = createRealtimeNotification({
      id: `notif-quote-${Date.now()}`,
      type: 'aceite_orcamento',
      title: sample.title,
      message: sample.message,
      clientName: sample.clientName,
      neighborhood: sample.neighborhood,
      urgencyOrScope: sample.urgencyOrScope,
      timestamp: 'Agora mesmo',
      clientWhatsapp: sample.clientWhatsapp,
    });

    onUpdateNotifications((prev) => [newNotif, ...prev]);
  };

  const handleMarkSingleRead = (id: string) => {
    onUpdateNotifications((prev) => markProviderNotificationsRead(prev, id));
  };

  const handleMarkAllRead = () => {
    onUpdateNotifications((prev) => markProviderNotificationsRead(prev));
  };

  return (
    <section
      aria-label="Notificações de status em tempo real"
      className="bg-white rounded-3xl p-5 sm:p-6 border border-[#0A2540]/10 space-y-5"
    >
      {/* Top Header & Live Simulation Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#0A2540]/10 pb-4">
        <div className="space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1D6FE0]">
              <span className="w-2 h-2 rounded-full bg-[#FF6A00] animate-pulse shrink-0" />
              <span>Monitoramento de Status em Tempo Real</span>
            </span>
            <span aria-hidden="true" className="text-xs text-[#0A2540]/30">
              ·
            </span>
            <span
              data-testid="realtime-unread-badge"
              className="text-xs font-mono font-semibold text-[#0A2540]"
            >
              {unreadCount > 0
                ? `${unreadCount} nova(s) não lida(s)`
                : 'Todas as notificações lidas'}
            </span>
          </div>

          <h2 className="font-display font-bold text-lg sm:text-xl text-[#0A2540]">
            Alertas de novas oportunidades e aceites de orçamento
          </h2>
          <p className="text-xs text-[#0A2540]/70">
            Acompanhe em tempo real quando um cliente compatível envia um pedido na sua região ou aprova seu orçamento técnico.
          </p>
        </div>

        {/* Action buttons to trigger real-time status notifications */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleSimulateNewOpportunity}
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#1D6FE0] hover:bg-[#175cc0] text-white text-xs font-display font-semibold transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 shrink-0" />
            <span>Simular nova oportunidade</span>
          </button>

          <button
            type="button"
            onClick={handleSimulateQuoteAcceptance}
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#FF6A00] hover:bg-[#e65f00] text-white text-xs font-display font-semibold transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>Simular aceite de orçamento</span>
          </button>
        </div>
      </div>

      {/* Filter Bar & Mark All as Read */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div
          role="group"
          aria-label="Filtrar notificações em tempo real"
          className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-1.5"
        >
          <button
            type="button"
            onClick={() => setFilterType('todas')}
            className={`min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              filterType === 'todas'
                ? 'bg-[#0A2540] text-white'
                : 'bg-[#F4F2EF] text-[#0A2540]/80 hover:text-[#0A2540]'
            }`}
          >
            Todas ({notifications.length})
          </button>

          <button
            type="button"
            onClick={() => setFilterType('nova_oportunidade')}
            className={`min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              filterType === 'nova_oportunidade'
                ? 'bg-[#1D6FE0] text-white'
                : 'bg-[#F4F2EF] text-[#0A2540]/80 hover:text-[#0A2540]'
            }`}
          >
            Novas Oportunidades ({oppNotifCount})
          </button>

          <button
            type="button"
            onClick={() => setFilterType('aceite_orcamento')}
            className={`min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              filterType === 'aceite_orcamento'
                ? 'bg-[#FF6A00] text-white'
                : 'bg-[#F4F2EF] text-[#0A2540]/80 hover:text-[#0A2540]'
            }`}
          >
            Aceites de Orçamento ({quoteNotifCount})
          </button>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="text-left sm:text-right text-xs font-semibold text-[#1D6FE0] hover:text-[#0A2540] underline underline-offset-4 inline-flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <CheckCheck className="w-3.5 h-3.5 shrink-0" />
            <span>Marcar todas como lidas</span>
          </button>
        )}
      </div>

      {/* Real-time Notification Feed */}
      <div className="space-y-3" role="log" aria-live="polite">
        {filteredNotifications.map((item) => {
          const isNewOpp = item.type === 'nova_oportunidade';
          return (
            <div
              key={item.id}
              className={`rounded-2xl p-4 sm:p-5 border transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 min-w-0 ${
                !item.read
                  ? isNewOpp
                    ? 'bg-[#F4F2EF]/80 border-l-4 border-l-[#1D6FE0] border-[#0A2540]/15'
                    : 'bg-[#F4F2EF]/80 border-l-4 border-l-[#FF6A00] border-[#0A2540]/15'
                  : 'bg-white border-[#0A2540]/10 opacity-85'
              }`}
            >
              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className={`font-semibold ${
                      isNewOpp ? 'text-[#1D6FE0]' : 'text-[#FF6A00]'
                    }`}
                  >
                    {isNewOpp
                      ? '● Nova Oportunidade Compatível'
                      : '✓ Aceite de Orçamento Confirmado'}
                  </span>
                  <span aria-hidden="true" className="text-[#0A2540]/30">
                    ·
                  </span>
                  <span className="font-mono text-[#0A2540]/65">
                    {item.timestamp}
                  </span>
                  {!item.read && (
                    <span className="text-[11px] font-bold text-[#0A2540] bg-white px-2 py-0.5 rounded-md border border-[#0A2540]/10">
                      Novo
                    </span>
                  )}
                </div>

                <h3 className="font-display font-bold text-sm sm:text-base text-[#0A2540] leading-snug">
                  {item.title}
                </h3>

                <p className="text-xs sm:text-sm text-[#0A2540]/80 leading-relaxed">
                  {item.message}
                </p>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#0A2540]/70 pt-0.5">
                  <span>
                    <strong>Cliente:</strong> {item.clientName}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    <strong>Bairro:</strong> {item.neighborhood}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-medium text-[#0A2540]">
                    {item.urgencyOrScope}
                  </span>
                  {item.clientWhatsapp && !isNewOpp && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono font-semibold text-[#1D6FE0]">
                        WhatsApp: {item.clientWhatsapp}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                {isNewOpp && (
                  <button
                    type="button"
                    onClick={() => {
                      handleMarkSingleRead(item.id);
                      onFocusOpportunityTab();
                    }}
                    className="min-h-[38px] px-3.5 py-2 rounded-xl bg-[#0A2540] hover:bg-[#13385c] text-white text-xs font-semibold transition-colors text-center cursor-pointer"
                  >
                    Ver oportunidade na fila
                  </button>
                )}

                {!item.read && (
                  <button
                    type="button"
                    onClick={() => handleMarkSingleRead(item.id)}
                    className="min-h-[38px] px-3.5 py-2 rounded-xl bg-white hover:bg-[#F4F2EF] border border-[#0A2540]/15 text-[#0A2540] text-xs font-semibold transition-colors text-center cursor-pointer"
                  >
                    Confirmar leitura
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
