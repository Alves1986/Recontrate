# Auditoria de prontidão — Recontrate

**Data:** 17/11/2026
**Repositório:** `Alves1986/Confiare` (checkout local)
**Decisão de prontidão:** **NÃO LIBERAR produção nem piloto público com coleta de dados pessoais ou cobrança** até resolver os bloqueios críticos abaixo.

## Escopo e limites da auditoria

Esta é uma revisão estática do código local, em modo somente leitura quanto ao produto. Não acessei banco de dados, Vercel, Neon, Asaas, e-mail, WhatsApp, Google ou contas externas; não fiz cadastro, cobrança, envio de mensagem, migração, seed, limpeza, publicação, push, alteração de configuração ou teste destrutivo. A compilação local usou placeholders sintéticos e não comprova configuração de runtime. Não reproduzi no relatório segredos, valores de ambiente nem registros de pessoas.

O estado da implantação em `confiare.vercel.app` e a configuração real das variáveis na Vercel **não foram verificados nesta etapa**. Portanto, referências a riscos condicionais de segredo/configuração devem ser conferidas em staging de forma autorizada antes de qualquer uso real.

## Resumo executivo

O repositório contém uma base funcional ampla: SPA React/Vite, API Express, integração de banco Neon/Postgres, RLS, autenticação, marketplace, planos, campanhas, painel administrativo, recursos de PWA e uma demonstração isolada. Isso, por si só, não significa que os fluxos estejam prontos ou comprovados em ambiente real.

Os bloqueios de maior gravidade são:

1. **Segredos de sessão e webhook têm fallbacks fixos no código.** A aplicação não deve inicializar em produção sem segredos dedicados, fortes e separados.
2. **A confirmação de e-mail não comprova posse da caixa postal:** o token específico da aplicação é devolvido pela API de cadastro, a interface o envia automaticamente e avança mesmo sem checar se a resposta de confirmação teve sucesso.
3. **A recuperação de senha devolve o token de reset na resposta HTTP e a interface o usa diretamente.** Quem souber o e-mail de uma conta pode obter o token sem acesso à caixa postal. Bloquear cadastro real até redesenhar esse fluxo.
4. **Há rotas sensíveis sem autenticação/ownership explícitos** para assinatura e dispatch de oportunidades. Algumas proteções dependem de cabeçalhos enviados pelo cliente, que não são prova de identidade.
5. **A autorização de administrador aceita `x-user-role: admin` em qualquer runtime cujo `NODE_ENV` não seja exatamente `production`.** Isso torna um staging/dev exposto vulnerável; há também inconsistência com a detecção mais ampla de ambientes de produção.
6. **Consentimento vem marcado por padrão** no cadastro, na solicitação de serviço e na recontratação; os schemas da API também assumem consentimento quando omitido. A política pública promete proteção que não está alinhada a todos os dados renderizados: avaliações públicas mostram nome de exibição, bairro, serviço e comentário do cliente.
7. **Partes centrais da jornada continuam simuladas ou otimizistas:** o formulário inicia com dados de exemplo, conta anexos inexistentes, um provider fixo, cria objetos locais e ignora falhas das chamadas. Substituição e disponibilidade do painel profissional são majoritariamente estado de memória.
8. **A integração de cobrança falha aberta para um fallback sintético:** sem Asaas ou diante de certos erros, ela fabrica IDs/links; há também um CPF padrão fixo no adaptador. Não usar cobrança real antes de remover isso e validar no sandbox do gateway.
9. **Os preços de seed e a campanha não equivalem a um piloto operacional.** Não há lista de interesse. O valor do plano Padrinho diverge do valor de referência no briefing original e a seed volta a gravar dados comerciais sobre os existentes na inicialização.
10. **A compilação e os testes unitários seguros passaram, mas os testes integrados que provam Auth, RLS, Neon, marketplace e banco não foram executados.** Nenhuma conta externa ou banco real foi testado.

## Inventário técnico e dados

- O frontend usa rotas client-side; o backend concentra a API em `/api`. As rotas autenticadas de marketplace empregam `requireRole` e o código SQL de RLS tem políticas nos dois arquivos de migração principais. A presença de RLS no repositório **não comprova** que as políticas estejam aplicadas e corretas no banco configurado.
- A autenticação usa Neon Auth e tokens de sessão da aplicação. O servidor configura cookie `HttpOnly` e `SameSite=Lax`; o login/cadastro também devolve o JWT no corpo e o guarda em estado React. Logout limpa o cookie, mas não invalida um JWT Bearer já emitido, que pode continuar válido até expirar.
- Não encontrei uso de `localStorage` ou `sessionStorage` para dados de conta. O estado de páginas e formulários fica em memória React. O service worker exclui `/api/` do cache; guarda shell/arquivos estáticos e páginas de navegação para uso offline. Não vi cache de resposta de API autenticada nesse worker.
- `/demo` está explicitamente marcado como demonstração, com dados fictícios e ações em memória; seus testes de rota exercitam bloqueios de signup, pagamento e integrações. O modo de demonstração não substitui um ambiente de homologação com dados sintéticos e banco separado.
- Há seed, backup e limpeza como scripts manuais (`seed:demo`, `seed:reference`, `backup:full`, `cleanup:production`). Não os executei. Não há prova de que estejam agendados nem de que backups sejam restauráveis; a rotina de produção deve ser tratada como operação controlada.
- O projeto depende de configuração de runtime para Neon/Postgres, Auth/JWKS, Realtime, S3, gateway de IA e integrações opcionais de cobrança, e-mail, WhatsApp, Maps e contato público. Os nomes de variáveis documentados no código incluem `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_JWKS_URL`, `NEON_REALTIME_URL`, `NEON_REALTIME_SECRET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ENDPOINT_URL_S3`, `AWS_REGION`, `NEON_AI_GATEWAY_TOKEN`, `NEON_AI_GATEWAY_BASE_URL`, `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN`, `RESEND_API_KEY`, `WHATSAPP_BUSINESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `GOOGLE_MAPS_API_KEY` e `VITE_PUBLIC_CONTACT`. **A existência e o valor de cada uma nas configurações da Vercel não foram inspecionados.**

## Matriz de funcionalidades — 22 frentes

| # | Frente | Estado no código | Evidência e lacuna determinante |
|---:|---|---|---|
| 1 | Cadastro de cliente | **Parcial** | `/criar-conta` monta o formulário genérico `SignupPage`, que chama `/api/auth/register` e cria registros no banco. A tela mais detalhada `ClientRegistrationScreen` não está ligada à rota nem à persistência; categorias favoritas e preferência de contato dela não participam do fluxo real. Consentimento inicia marcado. O papel inicial do signup é cliente. |
| 2 | Cadastro de profissional | **Parcial** | O signup genérico permite escolher prestador e o serviço cria perfil profissional pendente. A tela `ProviderRegistrationScreen` não está montada. O CTA de prestador aponta para `/criar-conta?role=prestador`, mas o formulário não lê a query e abre como cliente. Campos de documento da tela antiga são apenas opções visuais, não upload nesse fluxo. |
| 3 | Confirmação de e-mail | **Insegura / parcial** | `AuthService.registerUser` cria um token próprio e o retorna; não chama o serviço de e-mail da aplicação para entregá-lo. A tela diz que enviou e confirma o próprio token recebido, sem verificar `res.ok` antes de avançar. Endpoints existem, mas não são prova de posse da caixa postal. |
| 4 | Login e logout | **Parcial** | Login, cookie de sessão e redirecionamento por papel existem. O JWT também é devolvido ao JavaScript; logout limpa cookie e estado local, mas não revoga Bearer emitido. O segredo de assinatura tem fallback fixo. Não foi testado com Neon real. |
| 5 | Recuperação de senha | **Bloqueador crítico** | Os endpoints existem, mas a solicitação de recuperação devolve `resetToken` no corpo e a interface o preenche automaticamente. Não há entrega segura desse token por e-mail comprovada. O teste de integração atual também espera o token no corpo; precisa ser substituído. |
| 6 | Onboarding | **Parcial** | Há endpoint autenticado e tela com salvamento. A autorização precisa impedir sessão sem e-mail confirmado; o fluxo foi apenas inspecionado e não executado com Auth/DB. |
| 7 | Perfil e verificação do prestador | **Parcial** | Existe estado de verificação e rota administrativa para aprovar. A listagem pública filtra demos/exclusões, mas não filtra `verification_status` para só expor aprovados. O painel escolhe o primeiro perfil público disponível como fallback, sem vincular `activeProvider` a `authUser.providerProfileId`; uma conta pode ver painel de outro perfil público. |
| 8 | Categorias e especialidades | **Parcial, com APIs** | Taxonomia/seed, busca de especialidades e endpoints de atualização/sugestões existem. Não verificado contra banco configurado; a escolha de categoria no signup tem pré-seleção. |
| 9 | Busca por serviço e região | **Parcial** | A interface filtra e classifica em memória os perfis carregados inicialmente; não encontrei chamada da interface ao endpoint de matching para cada busca. Filtros de bairro e disponibilidade não foram validados com cobertura geográfica real. A busca exibe uma Nota Composta mesmo sem histórico suficiente; com campos nulos/zero, a fórmula ainda gera uma nota e trata resposta em zero minutos como o melhor tempo. |
| 10 | Solicitação de serviço | **Parcial / enganosa** | A API cria solicitação e dispara matching; no cliente, a ação otimista cria itens locais e ignora a resposta/erro da API. O formulário começa com título/descrição, bairro, urgência, orçamento, consentimento e preferência já preenchidos; conta fotos sem upload real e mantém referência predefinida a um profissional. `preferredPreviousProviderId` e `photosCount` não são enviados no payload dessa rota. O telefone enviado vem de estado fixo local, não do perfil autenticado. |
| 11 | Matching e envio de oportunidades | **Parcial e inseguro** | O serviço de backend calcula candidatos, limites e pode enviar WhatsApp se configurado. A rota direta `/opportunities/dispatch` não requer autenticação nem deriva o perfil do prestador da sessão. A tela do painel não hidrata a lista de oportunidades do endpoint protegido; o estado de oportunidades pode ser local. |
| 12 | Consentimento e liberação de contato | **Proteção parcial** | A resposta de oportunidades mascara nome/WhatsApp até status aceito, consentimento e liberação. Porém, checkboxes de cadastro, solicitação e recontratação começam marcadas e schemas da API usam `default(true)`; portanto ausência de ação afirmativa pode virar consentimento. Solicitações também aceitam telefone do corpo do cliente. |
| 13 | Histórico / lista de confiança | **Parcial** | O serviço de avaliação escreve lista de confiança e existe endpoint autenticado; não encontrei carregamento do histórico na interface. Após recarregar, estado local não prova a lista real. |
| 14 | Avaliações e reputação | **Parcial, sem validação de atendimento** | Endpoint aceita `serviceRequestId` opcional; o formulário não o envia e a política RLS permite inserir avaliação própria sem exigir pedido concluído. A tela promete avaliações exclusivamente ligadas a pedidos reais. O serviço grava `customerName` e o perfil público renderiza esse nome, bairro, título e comentário; isso contradiz a promessa ampla de mascarar o nome e não há consentimento específico para publicar identidade/comentário. |
| 15 | Recontratação | **Parcial** | Há rota autenticada e gravação de pedido repetido, mas a tela primeiro altera memória local e descarta erros da chamada; não carrega histórico persistido. Resultado do servidor não é usado para confirmar sucesso. |
| 16 | Indicação de substituto | **Parcial / simulada** | APIs e verificações de papel existem; a rota da tela no `App.tsx` só atualiza estado React (`substituteReferral`) e não chama o endpoint de indicação. Após reload, o fluxo não prova persistência. |
| 17 | Apadrinhamento / mentoria | **Parcial** | Há rotas com papel, carregamento e criação de mentorias, além de tela que chama API. Não executado contra RLS/banco; selo e contagem pública exigem dados/moderação reais. |
| 18 | Planos e assinaturas | **Inseguro / não liberável** | UI e serviços oferecem checkout, upgrade, downgrade e cancelamento, mas as rotas de assinatura não exigem `requireAuth`/`requireRole` nem passam um proprietário confiável para validar o ID. O adaptador Asaas pode produzir retorno sintético em vez de falhar quando chave está ausente/erro; há um documento fiscal de fallback fixo. Nenhum pagamento de sandbox foi testado. |
| 19 | Oferta promocional | **Parcial; estado vivo desconhecido** | Código define 50% de desconto nos 3 primeiros ciclos mensais dos planos pagos elegíveis, retornando ao preço cheio no quarto; não inclui anual/gratuito. A rota de elegibilidade lê CPF/telefone/e-mail por query string, com risco de exposição em logs/histórico; mover dados sensíveis para POST/servidor e minimizar retenção. Status real da campanha no banco não foi visto. |
| 20 | Piloto gratuito / trial | **Não definido como piloto** | Existe plano Gratuito e campo opcional `startWithTrial` no checkout, mas não há protocolo/página própria de trial/piloto, duração e critérios de conversão claramente demonstrados. Não ativar trial por parâmetro público sem regra de elegibilidade e propriedade autenticada. |
| 21 | Lista de interesse / espera | **Não implementada** | Não encontrei formulário, endpoint, persistência, política de retenção ou fluxo de ativação. Não anunciar lista de espera como funcional. |
| 22 | Painel administrativo | **Parcial, sensível** | Rotas para planos, usuários, prestadores, anúncios, campanhas, métricas e backup existem. Os caminhos administrativos usam middleware, mas esse middleware aceita cabeçalho de papel em qualquer ambiente não exatamente `production`. Painel e notificações não foram exercitados; notificação de fim de campanha pode enviar comunicações reais se integração estiver ativa. |

## Bloqueios de segurança — antes de qualquer piloto público

### S0 — Segredos e recuperação de conta

- `src/services/authService.ts`: remover fallback fixo do segredo JWT. Exigir um `SESSION_SECRET` dedicado de alta entropia e impedir boot em produção se ausente; não reutilizar segredo de Realtime ou webhook. Rotacionar qualquer chave que possa ter sido usada.
- `src/services/billingProvider.ts`: remover fallback fixo do segredo de webhook e exigir `ASAAS_WEBHOOK_TOKEN` em produção. Testar rejeição de webhook falso e idempotência.
- Recuperação de senha: resposta pública genérica sem token; token de uso único armazenado com hash/expiração e entregue por canal validado; rate limiting distribuído; não permitir que UI avance sem sucesso comprovado. Impedir enumeração de contas.
- Confirmação de e-mail: enviar link/token ao endereço do usuário; não devolvê-lo no corpo da API; impedir login/rotas protegidas enquanto e-mail e status não forem aprovados no servidor.

### S0/S1 — Autorização e isolamento entre contas

- Aplicar autenticação e papel apropriado a `GET /providers/:providerId/subscription`, `POST /subscriptions/checkout`, rotas de upgrade/downgrade/cancelamento e `/opportunities/dispatch`.
- Derivar `providerProfileId` e `userId` da sessão verificada; não usar `x-provider-id` ou `x-user-role` como identidade/autorização. Validar propriedade da assinatura em cada leitura e mutação.
- Retirar o bypass `x-user-role: admin` de qualquer ambiente compartilhado, inclusive staging; se realmente indispensável para desenvolvimento, isolá-lo em mecanismo de teste que não possa ser configurado no deploy. Usar uma única função de detecção de produção.
- Adicionar testes negativos: usuário A não lê/altera assinatura, oportunidades, pedidos ou dados de usuário B; cliente não assume papel de prestador/admin; cabeçalhos forjados não mudam papel; testes RLS executados em banco de teste separado.

### S1 — Privacidade e reputação

- Consentimentos começam **desmarcados** e são gravados com finalidade, texto/versão, data e escopo. Não usar `default(true)` no backend para compartilhamento de telefone/WhatsApp.
- Não publicar nome identificável em avaliações por padrão. Separar autorização de compartilhar contato do consentimento de publicar avaliação; permitir pseudônimo/anônimo e esclarecer comentário, bairro e serviço.
- Exigir referência a solicitação concluída e pertencente ao cliente antes de aceitar avaliação; conferir relacionamento pedido–prestador–cliente no servidor, não apenas RLS de autor.
- Remover CPF/telefone/e-mail de query strings; não gravar dados sensíveis em logs e analytics. Revisar base legal, finalidade, retenção, direitos, controlador e canal de atendimento com assessoria apropriada antes de tratar dados reais. A página `/privacidade` atual é breve demais para representar um processo completo.

## Promessas de marketing versus comportamento observado

| Promessa | Evidência | Ajuste antes de publicar |
|---|---|---|
| “Profissionais verificados” / rede verificada | Campo e workflow de aprovação existem, mas a listagem pública não restringe os resultados a aprovados. | Filtrar por estado aprovado e mostrar o que foi verificado, por quem e quando; não exibir selo antes da aprovação. |
| “Nota Composta real”, resposta média, avaliações verificadas | Métricas existem na fórmula, mas busca calcula nota mesmo sem base; avaliação não exige serviço concluído; tela de perfil recebe lista vazia do mapeamento inicial e não atualiza as avaliações do fetch. | Ocultar nota/tempo até haver amostra suficiente, ligar avaliação a pedido concluído e sincronizar o retorno real; sinalizar “sem histórico” sem pontuação fabricada. |
| “Telefone protegido até você escolher” | API de oportunidades mascara contato sob condições específicas, mas consentimento inicia marcado e perfil público mostra dados de quem avaliou. | Corrigir consentimentos, anonimizar reviews e testar ponta a ponta a liberação e revogação de contato. |
| “Recontratar em um clique” e histórico salvo | API existe, mas a tela atualiza memória local, ignora falha e não carrega lista persistida. | Mostrar confirmação somente após persistência e implementar estados de erro/recarga; senão, reduzir a promessa. |
| “Indicação de substituto” | Backend tem endpoints; a jornada da tela atual é estado local. | Integrar tela às rotas e fluxo de autorização ou retirar CTA até funcionar. |
| “Sem leilão de leads” e 0% de comissão | Não encontrei cobrança percentual por serviço no fluxo; planos, porém, dão prioridade/destaque de matching conforme nível pago. | Pode dizer “sem comissão sobre o valor do serviço” se comercial/termos confirmarem; explicar de modo transparente que assinatura e prioridade variam por plano. |
| “Disponível em sua região” | Categorias são taxonomia geral; cobertura depende dos perfis existentes. | Exibir cobertura com base em oferta ativa aprovada; quando não houver profissionais, oferecer lista de interesse real — hoje inexistente. |

## Planos, preços e campanha no código

Os valores que encontrei na seed (não confirmados no banco ativo) são:

| Plano | Mensal | Anual | Limite mensal de oportunidades |
|---|---:|---:|---:|
| Gratuito | R$ 0,00 | R$ 0,00 | 5 |
| Essencial | R$ 29,90 | R$ 299,00 | 15 |
| Profissional | R$ 59,90 | R$ 599,00 | 40 |
| Premium | R$ 99,90 | R$ 999,00 | 100 |
| Padrinho | R$ 109,90 | R$ 1.099,00 | 100 |

Os anuais equivalem a 10 mensalidades (aproximadamente dois meses de desconto). A campanha no código prevê **50% nos 3 primeiros ciclos mensais** para Essencial, Profissional, Premium e Padrinho; a partir do quarto ciclo aplica-se o preço cheio; ciclo anual e plano gratuito não são elegíveis. A elegibilidade limita-se a novo prestador/primeira assinatura e controles de reuso, mas a configuração real da campanha não foi consultada.

**Inconsistência a resolver:** no briefing original, Padrinho foi apresentado a R$ 99,90; a seed atual define R$ 109,90 (e a campanha correspondente usa metade desse preço). Aprovar um valor antes de expor planos. Além disso, a inicialização usa `ON CONFLICT` para atualizar preços, limites e outros campos com defaults do código; alterações feitas por admin diretamente no banco podem ser sobrescritas no próximo boot/deploy. Definir uma única fonte de verdade e tornar seed de planos uma migração/controlada, não uma correção comercial automática.

## Marca, identidade, metadados e links

- A marca visível foi trocada no frontend, título, descrição, manifest e favicon para **Recontrate**. O `BrandLogo` atual é principalmente um wordmark tipográfico; o ícone é provisório e não comprova a aprovação de um símbolo/identidade final.
- O `index.html` contém título, descrição e Open Graph textual, mas não `og:image`/imagem social. O manifest usa SVG para ícone; validar ícones PNG em tamanhos instaláveis, inclusive iOS, em aparelhos reais.
- Há arquivos antigos de referência de marca e materiais do projeto sob `public/assets/aistudio`. Não encontrei referência deles na UI principal; por estarem sob `public`, Vite pode copiá-los para o artefato estático. Revisar se devem sair da área pública, especialmente documentos de briefing, antes de publicar.
- Ainda aparecem identificadores técnicos e/ou mensagens de serviço com `Confiare` (por exemplo, nome interno do componente legado, cache/service worker, emissão de cobrança, defaults do banco e domínios antigos). Isso não requer renomeação cega. Preservar, até migração coordenada, cookie de sessão, issuer JWT, tabelas/colunas/enums, IDs de plano, callbacks de Auth e chaves do webhook; são contratos e estado, não identidade visual.
- Remetente padrão de e-mail e referências a domínio antigo precisam de uma decisão de domínio/remetente e verificação DNS/SPF/DKIM/DMARC antes do envio. `VITE_PUBLIC_CONTACT` é opcional; sem ele a interface pode ficar sem contato público. Confirmar domínio, redirects, links antigos e handles antes de alterar.
- Há chamadas e dependências externas (Neon, Asaas, Resend, Meta/WhatsApp, Google Maps/Ads, Google Fonts e o domínio legado do produto). Confirmar propriedade, callback URLs, política de dados, termos dos provedores e comportamento sem cada integração. Não encontrei evidência de que todos os domínios do produto já apontem para a nova marca.
- Em celular/PWA, usuário não autenticado que abre `/` recebe **tela de login**, não a landing pública; isso é intencional no helper atual, mas deve ser decisão explícita de aquisição/SEO. As capturas locais anteriores cobrem desktop/tablet/mobile, não um teste funcional de navegação real.

## Testes e build realizados

- `npm run lint`: **passou** (TypeScript).
- `npm run build`: **passou** com placeholders locais; não verifica Neon, Asaas, e-mail ou WhatsApp reais. O build avisou que a configuração Vite ainda usa `__dirname` e imports sem extensão compatíveis com o loader atual; também reportou um bundle JavaScript de aproximadamente **831 kB** não comprimido, acima do limite de aviso de 500 kB. Planejar code splitting/performance.
- Testes unitários seguros: **10** casos combinados de PWA/regras de marketplace; **2** de adaptador de cobrança local; **4** de rota/modo demo em loopback; **3** casos filtrados de guardas ambientais — total de **19**. Não fizeram cobrança, seed ou chamada de integração real.
- Não executei a suíte completa `npm test`: os testes de auth/RLS, marketplace E2E, planos e ciclo de assinatura exigem configuração/banco/serviços e alguns fluxos podem fazer escrita. Também não fiz teste automatizado de teclado/axe nem teste de recuperação por e-mail.
- O CSS contém regra global `:focus-visible`, mas há 24 usos de `focus:outline-none`; o resultado da cascata e a visibilidade do foco em todos os controles não foram validados com teclado. Verificar WCAG AA em cada estado, contraste de foco, rótulos, mensagens de erro e leitor de tela antes do piloto.

## Critério de liberação

Não abrir cadastro público, coletar telefone/CPF, aceitar pedidos reais, prometer verificação/reputação ou habilitar cobrança até que os itens S0 acima estejam corrigidos e testados em staging isolado. Após isso, usar a checklist e critérios de aceite em [Plano de prontidão do piloto](./plano-piloto.md).
