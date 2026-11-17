# Plano de prontidão e piloto — Recontrate

**Objetivo:** levar o checkout atual a um piloto pequeno e controlado, sem expor clientes a falhas de autorização, coleta indevida de dados ou cobranças sem gateway validado.
**Premissa:** este documento é um plano; nenhuma correção, alteração de preço, configuração externa ou publicação foi executada.

## Decisão executiva

**Não iniciar ainda um piloto aberto com clientes, cadastro público, contatos ou pagamento real.** Começar por um ambiente de staging isolado, finalizar os bloqueios críticos, validar fluxos ponta a ponta com dados sintéticos e somente então decidir entre:

1. **lista de interesse**, se ainda não houver oferta e atendimento confiáveis na região; ou
2. **piloto fechado**, se já houver prestadores aprovados, suporte operacional e capacidade de responder aos pedidos.

O código atual tem um plano Gratuito, mas isso não equivale a um programa de piloto: não há lista de espera, regras de coorte, seleção manual, canal de suporte e metas de encerramento implementados. Não anunciar “piloto gratuito” como funcional até isso ser definido e testado.

## Ordem recomendada de trabalho

### Etapa 0 — Congelar o risco e preparar ambientes (bloqueante)

- Não conectar este branch a produção nem habilitar cadastros/cobrança reais.
- Criar/confirmar `development`, `staging` e `production` independentes, com banco e credenciais segregados. Staging usa exclusivamente pessoas/profissionais sintéticos.
- Conferir no painel da Vercel qual branch/projeto é publicado e se push dispara deploy automático. O estado remoto não foi verificado nesta auditoria; não fazer push até confirmar esse vínculo.
- Fazer um backup autorizado e verificar, em staging, que o restore funciona. Não executar `cleanup:production`, seed de referência ou seed demo em bancos reais.
- Fazer inventário de URLs de callback, domínios, remetente de e-mail, endpoints de webhook, integração Google/WhatsApp e responsáveis; registrar somente nomes de variáveis/serviços, sem espalhar segredos em tickets/logs.

**Saída da etapa:** ambiente de staging separado, deploy fechado e procedimento de rollback documentado.

### Etapa 1 — Corrigir segurança e autorização (P0)

1. **Segredo de sessão:** exigir segredo dedicado, aleatório, forte e configurado no runtime; remover fallbacks em código e impedir boot de produção sem ele. Separar segredo JWT, segredo de webhook e chaves dos provedores; rotacionar segredos possivelmente usados.
2. **Recuperação de senha:** tornar a resposta externa genérica, remover token do JSON e da UI, entregar link de uso único por canal confirmado, hashear tokens persistidos, expirar/inutilizar após uso e limitar tentativas também entre instâncias. Não diferenciar conta existente da inexistente na resposta.
3. **Confirmação de e-mail:** enviar link real; nunca devolver o token; verificar resultado HTTP antes de navegar; bloquear login e todas as rotas protegidas até o servidor confirmar `emailVerified=true` e status ativo.
4. **Logout:** remover token do estado JavaScript sempre que possível e definir política de revogação/invalidação. No mínimo, tokens Bearer devem expirar adequadamente e não permitir que apagar apenas o cookie seja descrito como revogação total.
5. **Autorização de assinatura:** exigir sessão e papel de prestador; obter `providerProfileId` da sessão, verificar propriedade de cada assinatura e impedir ler/alterar/cancelar recurso de outra conta. Não tratar IDs nem headers de cliente como autorização.
6. **Dispatch de oportunidades:** autenticar o prestador e vincular dispatch a um pedido e a uma ação de sistema autorizados; proteger quota contra abuso e não aceitar provider ID arbitrário como fonte de identidade.
7. **Administrador:** remover bypass por `x-user-role` em staging/ambientes compartilhados; exigir sessão persistida com papel admin. Usar a mesma função de detecção de produção em cookie, middleware e guardas.
8. **Webhook Asaas:** exigir token dedicado e validar assinatura, evento, valor, moeda, referência, estado e idempotência. Falha de configuração deve bloquear o processamento, não ser silenciosamente aceita.

**Aceite P0:** testes negativos demonstram que cabeçalhos adulterados e IDs conhecidos não ultrapassam autorização; tokens de e-mail/reset não aparecem em respostas ou logs; nenhuma rota de dados/assinatura aceita usuário pendente ou sem ownership.

### Etapa 2 — Privacidade, consentimento e reputação (P0/P1)

- Iniciar consentimentos desmarcados, com texto claro por finalidade. Rejeitar ausência de consentimento no servidor, sem default positivo.
- Persistir texto/versão, timestamp e escopo de cada consentimento. O consentimento para compartilhar contato para um pedido não deve ser tratado como consentimento para publicar avaliação.
- Remover dado fictício dos campos iniciais de cliente/prestador/pedido. Cidade, bairro, categoria, orçamento, urgência, tempo e fornecedor anterior começam vazios ou com valor claramente rotulado como exemplo não enviado.
- Anexos só aparecem como anexados após upload real; retirar contador que apenas incrementa. “Profissional que já atendeu” precisa vir da lista confiável persistida, nunca de um ID de fixture.
- Vincular avaliação a pedido concluído, pertencente ao cliente e ao prestador avaliado. Impedir várias avaliações fora da regra definida. Apresentar nome pseudônimo/anônimo por padrão e obter autorização separada antes de publicar dados identificáveis.
- Fazer uma revisão de privacidade/termos com profissional responsável: controlador e canal de contato, dados coletados, finalidades, compartilhamento com prestadores e fornecedores, retenção, direitos, cookies/analytics, segurança e exclusão de conta. A página atual é apenas um resumo e não deve ser tratada como política completa.
- Mover CPF/telefone/e-mail de consulta de elegibilidade para um request body protegido; eliminar exposição em URL, analytics e logs.

**Aceite:** ao enviar formulário incompleto, nenhuma falsa localização, foto, consentimento, fornecedor anterior ou métrica é gravada; um pedido com consentimento negado nunca libera telefone; nenhuma avaliação aparece como verificada sem pedido concluído válido.

### Etapa 3 — Integrar jornadas reais e retirar simulações (P1)

1. **Cadastro e onboarding:** ligar a seleção de papel à URL e reaproveitar um único formulário real; eliminar telas de cadastro órfãs ou integrá-las. Definir experiência da conta nos estados pendente, ativa, suspensa e incompleta.
2. **Perfil profissional:** carregar e editar o perfil associado a `providerProfileId` da sessão; não selecionar o primeiro perfil público como fallback. Usar endpoint protegido para o painel, documentar verificação e só publicar perfis aprovados.
3. **Busca:** ligar filtros e solicitação à API de matching real; indicar a região atendida, a atualização dos resultados e estado sem oferta. Esconder nota, velocidade e taxa enquanto não houver amostra mínima; não calcular score com zeros ou dados ausentes.
4. **Pedido:** persistir e aguardar resposta do servidor antes de mostrar “enviado”; manter formulário em caso de falha; não fabricar oportunidade local. Usar dados de contato do perfil autenticado e enviar apenas campos necessários.
5. **Painel do prestador:** buscar oportunidades reais, limite, assinatura e disponibilidade pela API; ações de aceitar/recusar/pausar precisam persistir e exibir erro/estado confirmado.
6. **Histórico e recontratação:** ler lista do backend, não estado temporário; atualizar depois de recontratar e validar proprietário/consentimento.
7. **Substituição:** integrar a tela às rotas com autorização do cliente e do profissional original; se a capacidade operacional de aprovar a rede não existe, retirar CTA e promessa até a entrega.
8. **Avaliações:** buscar detalhes públicos reais do endpoint e aplicar minimização de dados. Atualmente, o mapeamento inicial de perfil usa `reviews: []` e a tela de perfil não substitui essa lista pelo payload do endpoint.
9. **Interesse:** caso a área ainda não tenha oferta, entregar primeiro uma lista de interesse simples e real; se não for prioridade, mostrar CTA de contato que funcione e não alegar cobertura.

**Aceite:** atualizar a página não perde um pedido, avaliação, preferência ou histórico persistido; tela só apresenta sucesso após API confirmar; respostas, mensagens e contatos correspondem ao perfil autenticado.

### Etapa 4 — Cobrança e decisão comercial (P1)

- Remover o fallback sintético do Asaas em runtime real. Ausência de API key, erro HTTP e indisponibilidade devem falhar de forma explícita e não criar assinatura/invoice/URL que pareçam reais.
- Eliminar documento fiscal padrão do código; tornar o dado obrigatório quando o gateway exigir, com validação e mensagem segura.
- Homologar checkout, pagamentos aprovados/recusados, webhook duplicado, atraso, cancelamento, upgrade, downgrade, inadimplência, reembolso/estorno e retomada com o **sandbox oficial** do gateway. Confirmar conciliação entre valor cobrado, status de assinatura, nota/invoice e plano.
- Aprovar a tabela de valores antes da seed/deploy. A seed atual é Gratuito R$ 0 (5 oportunidades), Essencial R$ 29,90 (15), Profissional R$ 59,90 (40), Premium R$ 99,90 (100) e Padrinho R$ 109,90 (100). O valor Padrinho conflita com R$ 99,90 informado no briefing original.
- Os anuais custam dez mensalidades. Decidir e exibir com clareza o total debitado, a equivalência mensal, a economia e as condições de cancelamento.
- A campanha é 50% por três ciclos mensais; o quarto ciclo volta ao preço cheio. Exibir valor promocional, valor cheio a partir do quarto mês, elegibilidade, duração, limite e cancelamento antes da confirmação. Verificar campanha ativa em staging, não inferir pela seed.
- Escolher uma única fonte de verdade: banco/admin ou configuração versionada. Hoje a inicialização reaplica valores estáticos de planos sobre linhas existentes; tornar alterações administrativas duráveis.
- Definir cobrança de piloto: recomendação conservadora é não cobrar nem pedir cartão na primeira coorte. Usar acesso gratuito controlado manualmente enquanto se valida oferta/atendimento; só ligar pagamento quando sandbox, termos comerciais, cancelamento e suporte estiverem aprovados.

**Aceite:** ambiente de teste jamais gera link de cobrança real; produção nunca finge sucesso; o cliente vê o total correto e nenhum status “ativa” depende apenas de retorno simulado.

### Etapa 5 — Escolher a estratégia de entrada: lista de interesse ou piloto fechado

#### Se a oferta na região ainda for incerta: lista de interesse

- Escolher uma microrregião e poucas categorias para avaliar oferta. Criar formulário mínimo (papel, e-mail, região aproximada, categorias de interesse), sem pedir CPF/WhatsApp até haver justificativa operacional.
- Armazenar no servidor com acesso restrito, consentimento específico para contato, data/finalidade, rate limit, anti-spam, exclusão e retenção definida. Não colocar PII em URL.
- Separar listas de clientes e prestadores; não apresentar o cadastro como conta ativa, pedido de serviço ou profissional verificado.
- Não usar números de inscritos como prova social sem base real e autorização. Publicar atualização sobre andamento com consentimento de comunicação.

#### Se já houver capacidade de atendimento: piloto fechado

- Convidar manualmente grupo limitado em uma única região; aprovar profissionais, categorias, horários e cobertura antes do convite a clientes.
- Usar o plano Gratuito existente apenas depois de definir se os seus anúncios/limite de oportunidades são adequados; não apresentar o campo genérico `trial` como programa. Não habilitar cobranças automáticas na primeira fase.
- Ter moderador responsável, canal de suporte testado, prazo de resposta, procedimento para profissional indisponível, reclamação, incidente de privacidade, contato indevido e remoção de conta.
- Deixar claro que prestador negocia preço do serviço com cliente e que o app pode cobrar assinatura em fase futura, se isso estiver aprovado nos termos.
- Definir antes do piloto critérios de continuidade: proporção de cadastros concluídos/verificados, pedidos válidos, correspondência, resposta, serviços realizados, reclamações, pedidos sem oferta e retorno/recontratação. Use agregados; não publicar nomes ou números prematuramente.

**Regra de escolha:** sem uma base aprovada e atendimento testado, começar por lista de interesse. Se houver supply local suficiente e suporte de operação, pilotar por convite. O código atual ainda não entrega a lista de interesse.

### Etapa 6 — Homologação de interface, confiabilidade e operação (P1/P2)

- Criar E2E automatizado em navegador contra API e banco de teste segregados: cadastro, confirmação, login, recuperação, onboarding, pedido, matching, aceitação, consentimento de contato, conclusão, review, recontratação, assinatura e cancelamento.
- Testar isolamento com pelo menos dois clientes, dois prestadores e um admin; conferir filtros RLS na consulta e nas mutações, e também IDs diretos/API em requests manuais.
- Usar mocks/stubs para e-mail, WhatsApp, Maps, S3 e IA nos testes; somente usar sandbox oficial de pagamento. Nenhum teste deve reutilizar banco/segredo de produção.
- Executar teste de teclado completo, leitor de tela básico, zoom 200%, navegação sem mouse e estados de erro; confirmar contraste WCAG AA para texto, foco, hover, disabled e fundos escuros. Testar iPhone/Safari, Android/Chrome, tablet e desktop.
- Confirmar PWA: instalação, ícones reais compatíveis, atualização do service worker, logout/expiração, funcionamento offline apenas do shell e ausência de cache de dados privados. Decidir explicitamente se mobile deve abrir em login ou na página pública.
- Medir tempo de carregamento móvel e fracionar o bundle de aproximadamente 831 kB. Corrigir avisos de compatibilidade do loader Vite e reexecutar build.
- Adicionar monitoramento de erros sem dados sensíveis, alerta de indisponibilidade, health check, logs estruturados redigidos, limites por IP/conta e plantão responsável durante o piloto.
- Verificar backup e restauração de ponta a ponta; preparar runbook de incidente, exportação/exclusão de conta e rollback de release.

## Critérios finais para autorizar piloto

Marcar todos os itens abaixo como aprovados em uma revisão conjunta produto/engenharia/operacional; não é suficiente compilar:

- [ ] Segredos fortes, separados, configurados somente no gerenciador de ambiente e sem fallback fixo.
- [ ] Reset e confirmação de e-mail entregues por canal real, tokens nunca devolvidos à UI e servidor bloqueando conta não confirmada.
- [ ] Testes de autorização/RLS entre contas aprovados, incluindo abuso de IDs e headers; admin fechado sem credencial real em todos os ambientes.
- [ ] Nenhum consentimento pré-marcado/default; política de privacidade e termos revistos; avaliações identificáveis protegidas e vinculadas a serviço concluído.
- [ ] Formulários sem dados de exemplo enviados; anexos e histórico reais; usuário é vinculado ao próprio perfil.
- [ ] Busca, matching, dispatch, recontratação e substituição persistem ou são retirados/desabilitados até estarem reais.
- [ ] Cobrança fail-closed e homologada em sandbox; preço Padrinho aprovado; promo e preço após desconto explícitos.
- [ ] Perfis públicos somente com aprovação; scores sem base e depoimentos artificiais não aparecem.
- [ ] Suporte, moderação, tratamento de reclamações, incidentes, backup/restore, cancelamento e rollback prontos.
- [ ] Vercel/domínio/remetente/callbacks/integrações confirmados; piloto fechado, lista de interesse ou ausência de CTA escolhidos conscientemente.

## Sequência de implementação sugerida

1. Corrigir S0 de tokens, reset de senha, confirmação de e-mail, autorização e fallback de cobrança.
2. Corrigir consentimento/privacidade, dados pré-preenchidos e vínculo de avaliação com serviço.
3. Integrar painel profissional, oportunidades, busca, pedido, histórico e avaliação a respostas persistidas; desativar fluxos que não possam ser concluídos.
4. Resolver tabela de preços e domínio/remetente; conferir campanha e regras de operação.
5. Entregar lista de interesse **ou** preparar coorte de piloto fechado com suporte manual.
6. Executar E2E/RLS/a11y/sandbox/restore em staging e preencher os critérios acima.
7. Só então pedir aprovação para publicar; nenhuma publicação está autorizada por este documento.
