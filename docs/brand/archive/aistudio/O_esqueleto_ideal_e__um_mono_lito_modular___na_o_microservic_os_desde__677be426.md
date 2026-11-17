O esqueleto ideal é um **monólito modular** — não microserviços desde o primeiro dia. Você separa as áreas de negócio em módulos internos, mas mantém um único sistema inicialmente; isso reduz custo, acelera o MVP e permite extrair serviços depois se houver escala. Um marketplace bem estruturado normalmente organiza identidade, catálogo, matching, transações, comunicação e reputação como módulos distintos.[1][2][3]  
  
## 1. Arquitetura geral  
  
```text  
Cliente / Prestador / Admin  
            |  
      Web responsivo  
      (PWA primeiro)  
            |  
        API Gateway  
            |  
   Aplicação modular (monólito)  
   ├── Identidade e Acesso  
   ├── Perfis e Verificação  
   ├── Catálogo de Serviços  
   ├── Solicitações e Matching  
   ├── Oportunidades e Notificações  
   ├── Recompra e Indicações  
   ├── Apadrinhamento  
   ├── Reputação e Avaliações  
   ├── Assinaturas e Cobrança  
   ├── Moderação e Suporte  
   └── Relatórios e Analytics  
            |  
  PostgreSQL + Redis + Storage + Filas  
            |  
  WhatsApp API / E-mail / Push / Pagamentos  
```  
  
**Recomendação inicial:** uma aplicação backend única, com módulos bem delimitados; PostgreSQL como banco principal; Redis para filas, cache e limites; armazenamento de objetos para fotos e documentos; e filas para envio de notificações. Essa abordagem é indicada para marketplaces novos porque preserva simplicidade operacional sem impedir evolução futura.[2][3]  
  
## 2. Front-end  
  
Comece com **web responsivo (PWA)**, não com dois apps nativos. Depois, se houver tração, crie apps para iOS e Android reaproveitando a mesma API.  
  
### Telas do cliente  
  
- Onboarding e cadastro.  
- Home com busca por serviço e localização.  
- Seleção de categoria.  
- Formulário de solicitação de serviço.  
- Lista de profissionais compatíveis.  
- Perfil público do prestador.  
- Solicitar novamente um profissional.  
- Aceitar indicação de substituto.  
- Histórico de serviços.  
- “Meus profissionais de confiança”.  
- Avaliação pós-atendimento.  
- Central de privacidade e consentimentos.  
- Suporte e denúncia.  
  
### Telas do prestador  
  
- Cadastro e verificação.  
- Perfil profissional.  
- Portfólio e fotos.  
- Área de atendimento e disponibilidade.  
- Central de oportunidades.  
- Detalhe da oportunidade.  
- Aceitar / recusar / indicar substituto.  
- Histórico de atendimentos.  
- Reputação e estatísticas.  
- Planos e cobrança.  
- Ferramentas de posicionamento digital.  
- Configurações de privacidade.  
  
### Telas do padrinho  
  
- Painel do padrinho.  
- Lista de indicados.  
- Solicitações de apadrinhamento.  
- Indicar substituto.  
- Acompanhamento de reputação dos indicados.  
- Regras e benefícios do programa.  
  
### Telas do administrador  
  
- Dashboard operacional.  
- Aprovação de cadastros e documentos.  
- Gestão de categorias e cidades.  
- Gestão de planos.  
- Moderação de avaliações e denúncias.  
- Mediação de conflitos.  
- Relatórios de receita, churn e conversão.  
- Configuração de regras de matching.  
  
## 3. Módulos do backend  
  
### 3.1 Identidade e acesso  
  
Responsável por contas, autenticação, papéis e permissões.  
  
**Funções**  
  
- Cadastro por telefone, e-mail ou Google.  
- Login por SMS, e-mail, senha ou OAuth.  
- Um usuário pode ser cliente, prestador ou ambos.  
- Perfis separados para cliente e prestador.  
- Recuperação de senha.  
- Sessões e tokens.  
- Controle de acesso por papel.  
- Bloqueio e suspensão de conta.  
  
**Regra importante:** “prestador” e “cliente” devem ser papéis ou perfis vinculados ao mesmo usuário, não tabelas totalmente separadas. Assim, uma pessoa pode contratar um serviço e também oferecer outro.  
  
### 3.2 Perfis e verificação  
  
**Funções**  
  
- Criar e editar perfil.  
- Upload de foto, portfólio e documentos.  
- Verificação de identidade.  
- Validação de telefone e WhatsApp.  
- Confirmação de área de atendimento.  
- Selo “Verificado”.  
- Status do cadastro: rascunho, pendente, aprovado, reprovado, suspenso.  
- Consentimentos LGPD e aceites de termos.  
  
### 3.3 Catálogo de serviços  
  
**Funções**  
  
- Categorias: eletricista, encanador, diarista, pintor, técnico de ar-condicionado etc.  
- Subcategorias e especialidades.  
- Serviços oferecidos pelo prestador.  
- Regras por categoria: documentos exigidos, perguntas do cliente, urgência e raio máximo.  
- Configuração de cidades e bairros.  
- Tags e palavras-chave para busca.  
  
Exemplo:  
  
```text  
Categoria: Elétrica  
Serviço: Instalação de chuveiro  
Especialidade: Instalações elétricas residenciais  
Perguntas: Potência do chuveiro? Existe fiação instalada? Urgência?  
```  
  
### 3.4 Solicitação de serviço  
  
É o “pedido” feito pelo cliente.  
  
**Funções**  
  
- Criar solicitação.  
- Anexar fotos, vídeos e áudio.  
- Definir bairro, endereço aproximado e urgência.  
- Escolher horário preferencial.  
- Informar orçamento estimado, opcional.  
- Autorizar contato por WhatsApp.  
- Cancelar solicitação.  
- Ver status da solicitação.  
  
**Status da solicitação**  
  
```text  
criada  
→ em_matching  
→ oportunidades_enviadas  
→ prestador_interessado  
→ contato_liberado  
→ em_negociacao  
→ agendado  
→ concluido  
→ avaliado  
→ cancelado  
→ expirado  
```  
  
### 3.5 Matching e distribuição  
  
É o motor que decide quais prestadores recebem a oportunidade.  
  
**Entradas**  
  
- Categoria e especialidade.  
- Localização e raio.  
- Disponibilidade.  
- Urgência.  
- Reputação.  
- Taxa de resposta.  
- Plano do prestador.  
- Histórico de recusas.  
- Capacidade diária de oportunidades.  
- Preferências do cliente.  
  
**Saída**  
  
- Lista ordenada de prestadores elegíveis.  
- Quantidade de oportunidades por rodada.  
- Prazo de resposta.  
- Fila de reserva, caso ninguém responda.  
  
**Regra de justiça**  
  
O plano Premium aumenta prioridade e limite, mas não pode monopolizar todas as oportunidades. Use um sistema de rodadas: primeiro envia para os mais compatíveis; se não houver resposta, aciona o próximo grupo.  
  
### 3.6 Oportunidades e notificações  
  
**Funções**  
  
- Criar oportunidade a partir da solicitação.  
- Enviar por WhatsApp, push e e-mail.  
- Controlar limite por plano.  
- Registrar entrega, abertura e resposta.  
- Controlar tempo de resposta.  
- Liberar contato após interesse e consentimento.  
- Impedir que o prestador veja dados sensíveis antes da liberação.  
- Registrar motivo de recusa.  
  
**Eventos principais**  
  
```text  
oportunidade_criada  
oportunidade_enviada  
oportunidade_visualizada  
oportunidade_aceita  
oportunidade_recusada  
oportunidade_expirada  
contato_liberado  
cliente_contatado  
```  
  
### 3.7 Recompra e “Meus profissionais”  
  
**Funções**  
  
- Guardar histórico de profissionais atendidos.  
- Permitir “Solicitar novamente”.  
- Enviar pedido direto ao prestador.  
- Exigir confirmação do prestador.  
- Mostrar disponibilidade.  
- Registrar recusa.  
- Oferecer indicação de substituto em caso de indisponibilidade.  
- Permitir favoritar profissionais.  
  
**Status do pedido direto**  
  
```text  
solicitado  
→ notificado  
→ aceito  
→ recusado  
→ expirado  
→ substituto_indicado  
```  
  
### 3.8 Indicação de substituto  
  
**Funções**  
  
- Profissional anterior pode indicar até 2 substitutos.  
- O cliente autoriza o compartilhamento do contexto.  
- O substituto recebe resumo do serviço, fotos e urgência.  
- O cliente vê o motivo da indicação.  
- A indicação é registrada nos perfis dos dois profissionais.  
- O cliente pode aceitar ou buscar outros profissionais.  
  
**Regras**  
  
- O indicador deve pertencer à mesma categoria ou a uma categoria compatível.  
- Não pode indicar conta suspensa ou reprovada.  
- Indicações repetidamente ruins reduzem o selo de confiabilidade do indicador.  
- A indicação não transfere responsabilidade automática pelo serviço anterior.  
  
### 3.9 Apadrinhamento  
  
**Funções**  
  
- Candidatura ao programa.  
- Análise de elegibilidade.  
- Aprovação do padrinho.  
- Convite ou aceite de apadrinhado.  
- Limite de indicados ativos.  
- Selo “Indicado por”.  
- Acompanhamento dos primeiros atendimentos.  
- Revisão periódica de desempenho.  
- Suspensão do selo por má performance.  
  
**Status do vínculo**  
  
```text  
solicitado  
→ em_analise  
→ ativo  
→ suspenso  
→ encerrado  
```  
  
### 3.10 Reputação e avaliações  
  
**Funções**  
  
- Avaliação somente após serviço registrado.  
- Nota de 1 a 5.  
- Critérios: qualidade, pontualidade, comunicação, organização e recomendação.  
- Comentário e fotos opcionais.  
- Resposta pública do prestador.  
- Denúncia de avaliação.  
- Cálculo de score composto.  
- Histórico imutável de eventos de reputação.  
  
**Score sugerido**  
  
```text  
Score =   
  (0,40 × média_avaliacoes)  
+ (0,20 × pontualidade_resposta)  
+ (0,20 × taxa_resposta)  
+ (0,10 × atendimentos_concluidos)  
+ (0,10 × perfil_verificado_e_completo)  
```  
  
A reputação deve influenciar o matching, mas nunca poder ser comprada.  
  
### 3.11 Assinaturas e cobrança  
  
**Funções**  
  
- Planos Essencial, Profissional, Premium e Padrinho.  
- Cobrança mensal recorrente.  
- Pix, cartão e boleto.  
- Teste gratuito opcional.  
- Upgrade e downgrade.  
- Cancelamento.  
- Inadimplência e bloqueio gradual.  
- Histórico de faturas.  
- Webhooks do gateway de pagamento.  
- Relatórios de MRR, churn e renovação.  
  
**Status da assinatura**  
  
```text  
trial  
→ ativa  
→ pendente  
→ inadimplente  
→ cancelada  
→ expirada  
```  
  
A cobrança recorrente pode ser feita por gateway especializado; a WhatsApp Business API também suporta fluxos de pagamento no Brasil, incluindo Pix, boleto e link de pagamento, mas isso é opcional para uma fase posterior.[4][5][6]  
  
### 3.12 Moderação, suporte e disputas  
  
**Funções**  
  
- Denúncia de perfil, serviço, avaliação ou mensagem.  
- Análise manual e automática.  
- Suspensão temporária ou permanente.  
- Mediação entre cliente e prestador.  
- Registro de decisão.  
- Reincidência e histórico de infrações.  
- Canal de atendimento humano.  
  
### 3.13 Analytics e relatórios  
  
**Funções**  
  
- Eventos de produto.  
- Funil de conversão.  
- Coorte de retenção.  
- Relatórios por cidade, categoria e plano.  
- Score de qualidade do matching.  
- Relatório do prestador.  
- Relatório financeiro.  
- Alertas operacionais.  
  
## 4. Modelo de dados  
  
Use PostgreSQL. Abaixo está o esqueleto das tabelas mais importantes.  
  
```sql  
users  
- id  
- nome  
- email  
- telefone  
- senha_hash  
- tipo: cliente | prestador | ambos | admin  
- status: ativo | pendente | suspenso | bloqueado  
- criado_em  
```  
  
```sql  
customer_profiles  
- id  
- user_id  
- bairro_principal  
- cidade  
- foto  
- preferencias_json  
- consentimento_marketing  
- consentimento_compartilhamento  
```  
  
```sql  
provider_profiles  
- id  
- user_id  
- nome_profissional  
- bio  
- foto  
- categoria_principal_id  
- anos_experiencia  
- area_atendimento_json  
- disponibilidade_json  
- whatsapp  
- status_verificacao  
- score_reputacao  
- plano_id  
- status: rascunho | pendente | aprovado | suspenso  
```  
  
```sql  
provider_documents  
- id  
- provider_profile_id  
- tipo: rg | cnh | comprovante | certificado | outro  
- arquivo_url  
- status: pendente | aprovado | reprovado  
- analisado_por  
- observacao  
```  
  
```sql  
categories  
- id  
- nome  
- slug  
- categoria_pai_id  
- ativo  
```  
  
```sql  
provider_services  
- id  
- provider_profile_id  
- category_id  
- especialidade  
- descricao  
- raio_atendimento_km  
- ativo  
```  
  
```sql  
service_requests  
- id  
- cliente_id  
- categoria_id  
- titulo  
- descricao  
- fotos_json  
- endereco_aproximado  
- bairro  
- cidade  
- urgencia  
- horario_preferencial  
- orcamento_estimado  
- status  
- criado_em  
- expira_em  
```  
  
```sql  
opportunities  
- id  
- service_request_id  
- provider_profile_id  
- plano_aplicado  
- prioridade  
- status: enviada | visualizada | aceita | recusada | expirada  
- enviada_em  
- respondida_em  
- motivo_recusa  
```  
  
```text  
service_assignments  
- id  
- service_request_id  
- provider_profile_id  
- origem: matching | recompra | indicacao_substituto  
- status: interesse | contato_liberado | negociacao | agendado | concluido | cancelado  
- escopo_json  
- valor_acordado  
- data_agendada  
- concluido_em  
```  
  
```sql  
reviews  
- id  
- service_assignment_id  
- cliente_id  
- provider_profile_id  
- nota  
- qualidade  
- pontualidade  
- comunicacao  
- organizacao  
- recomendaria  
- comentario  
- status: publicado | em_analise | oculto  
```  
  
```sql  
professional_trust_list  
- id  
- cliente_id  
- provider_profile_id  
- origem: atendimento_anterior | favorito  
- criado_em  
```  
  
```sql  
repeat_requests  
- id  
- cliente_id  
- provider_profile_id  
- service_request_original_id  
- nova_service_request_id  
- status: solicitado | aceito | recusado | expirado  
```  
  
```sql  
substitute_referrals  
- id  
- service_request_id  
- indicador_provider_id  
- substituto_provider_id  
- cliente_id  
- motivo  
- contexto_compartilhado  
- consentimento_cliente  
- status: enviado | aceito | recusado | expirado  
```  
  
```sql  
mentorships  
- id  
- padrinho_provider_id  
- apadrinhado_provider_id  
- status: solicitado | ativo | suspenso | encerrado  
- data_inicio  
- data_fim  
- desempenho_acumulado  
```  
  
```sql  
plans  
- id  
- nome  
- preco_centavos  
- ciclo: mensal | anual  
- limite_oportunidades  
- prioridade  
- recursos_json  
- ativo  
```  
  
```sql  
subscriptions  
- id  
- provider_profile_id  
- plano_id  
- status: trial | ativa | pendente | inadimplente | cancelada  
- inicio  
- proxima_cobranca  
- gateway_subscription_id  
```  
  
```sql  
invoices  
- id  
- subscription_id  
- valor_centavos  
- status: pendente | paga | falhou | estornada  
- metodo: pix | cartao | boleto  
- vencimento  
- pago_em  
- gateway_invoice_id  
```  
  
```sql  
notifications  
- id  
- user_id  
- canal: whatsapp | push | email  
- evento  
- titulo  
- corpo  
- status: agendada | enviada | entregue | falhou  
- referencia_externa  
```  
  
```sql  
audit_logs  
- id  
- usuario_id  
- acao  
- entidade  
- entidade_id  
- dados_anteriores_json  
- dados_novos_json  
- ip  
- criado_em  
```  
  
A modelagem deve separar o cadastro atual do prestador do registro histórico do atendimento. Em marketplaces, é comum preservar um snapshot dos dados relevantes no pedido, para que alterações posteriores no perfil não reescrevam fatos passados.[7][8]  
  
## 5. APIs principais  
  
Use REST para começar. Exemplos de endpoints:  
  
### Autenticação  
  
```http  
POST /auth/register  
POST /auth/login  
POST /auth/verify-phone  
POST /auth/forgot-password  
POST /auth/refresh  
```  
  
### Cliente  
  
```http  
GET  /me  
PATCH /me  
GET  /categories  
POST /service-requests  
GET  /service-requests/:id  
POST /service-requests/:id/cancel  
GET  /providers/:id  
POST /providers/:id/repeat-request  
GET  /my-trusted-providers  
POST /service-assignments/:id/review  
POST /reports  
```  
  
### Prestador  
  
```http  
GET  /provider/me  
PATCH /provider/me  
POST /provider/documents  
POST /provider/portfolio  
GET  /provider/opportunities  
GET  /provider/opportunities/:id  
POST /provider/opportunities/:id/accept  
POST /provider/opportunities/:id/reject  
POST /provider/opportunities/:id/refer-substitute  
GET  /provider/reputation  
GET  /provider/subscriptions  
POST /provider/subscriptions/upgrade  
POST /provider/subscriptions/cancel  
```  
  
### Padrinho  
  
```http  
GET  /mentor/me  
POST /mentor/apply  
GET  /mentor/mentees  
POST /mentor/mentees/:id/approve  
POST /mentor/mentees/:id/suspend  
POST /mentor/referrals  
```  
  
### Administração  
  
```http  
GET  /admin/providers/pending  
POST /admin/providers/:id/approve  
POST /admin/providers/:id/suspend  
GET  /admin/reports  
GET  /admin/disputes  
POST /admin/disputes/:id/resolve  
GET  /admin/subscriptions  
```  
  
## 6. Fluxos críticos  
  
### Fluxo de oportunidade  
  
```text  
Cliente cria solicitação  
        ↓  
Sistema valida dados e consentimento  
        ↓  
Matching encontra prestadores compatíveis  
        ↓  
Sistema cria oportunidades  
        ↓  
Fila envia WhatsApp / push / e-mail  
        ↓  
Prestador visualiza  
        ↓  
Prestador aceita ou recusa  
        ↓  
Cliente recebe prestador interessado  
        ↓  
Cliente autoriza contato  
        ↓  
Contato liberado  
        ↓  
Negociação fora ou dentro da plataforma  
        ↓  
Serviço concluído  
        ↓  
Avaliação e atualização de reputação  
```  
  
### Fluxo de recompra  
  
```text  
Cliente abre histórico  
        ↓  
Escolhe profissional anterior  
        ↓  
Clica em “Solicitar novamente”  
        ↓  
Sistema cria repeat_request  
        ↓  
Notifica profissional  
        ↓  
Profissional aceita?  
        ├── Sim → contato liberado  
        └── Não / expira → pergunta se deseja indicação  
                          ↓  
                    Profissional indica substituto  
                          ↓  
                    Cliente aceita ou busca outro  
```  
  
### Fluxo de apadrinhamento  
  
```text  
Iniciante se cadastra  
        ↓  
Perfil incompleto ou sem histórico  
        ↓  
Plataforma sugere padrinho  
        ↓  
Padrinho analisa perfil  
        ↓  
Aceita apadrinhar  
        ↓  
Selo “Indicado por” é ativado  
        ↓  
Iniciante recebe oportunidades  
        ↓  
Primeiros atendimentos são monitorados  
        ↓  
Desempenho bom?  
        ├── Sim → reputação própria cresce  
        └── Não → padrinho é alertado e selo pode ser revisado  
```  
  
## 7. Integrações externas  
  
| Integração | Uso | Prioridade |  
|---|---|---|  
| WhatsApp Business API | Notificar oportunidades, recompra, indicações e cobranças | Alta |  
| Gateway de pagamento | Assinatura recorrente, Pix, cartão e boleto | Alta |  
| Armazenamento em nuvem | Fotos, portfólio e documentos | Alta |  
| Mapas / geocodificação | Raio de atendimento e busca local | Alta |  
| E-mail transacional | Confirmações, recuperação de senha e relatórios | Média |  
| Push notifications | Alertas rápidos no app/PWA | Média |  
| Verificação de identidade | Validação de documentos e antifraude | Média |  
| Google Business Profile | Apoio à presença local do prestador | Futuro |  
| Analytics | Funil, retenção e crescimento | Média |  
  
A WhatsApp Business API é adequada para notificações transacionais e atualizações de pedido; para cobrança, ela permite fluxos com Pix, boleto e link de pagamento, mas a decisão de cobrar dentro do WhatsApp deve vir depois do MVP.[4][6][9]  
  
## 8. Segurança e permissões  
  
Implemente permissões no backend, não apenas na interface.  
  
**Regras mínimas**  
  
- Cliente só vê seus próprios pedidos e histórico.  
- Prestador só vê oportunidades destinadas a ele.  
- Contato do cliente só é liberado após consentimento e interesse do prestador.  
- Documentos de verificação são visíveis apenas para administradores autorizados.  
- Fotos e documentos ficam em URLs privadas ou assinadas temporariamente.  
- Toda ação sensível gera log de auditoria.  
- Rate limiting para evitar scraping e spam.  
- Criptografia em trânsito e em repouso.  
- Backups diários e teste de restauração.  
  
## 9. Stack tecnológica sugerida  
  
| Camada | Sugestão | Motivo |  
|---|---|---|  
| Front-end | Next.js ou React + PWA | Rápido, responsivo e compartilhável entre web e futuro app |  
| Backend | Node.js/NestJS, Laravel ou Django | Escolha conforme a equipe; todos atendem bem ao MVP |  
| Banco | PostgreSQL | Relacional, confiável e adequado para dados de marketplace |  
| Cache/filas | Redis + BullMQ, Sidekiq ou Celery | Notificações, matching e tarefas assíncronas |  
| Armazenamento | S3-compatible | Fotos, vídeos e documentos |  
| Notificações | WhatsApp Business API, e-mail e push | Canal principal no Brasil |  
| Pagamentos | Gateway brasileiro com recorrência | Assinaturas e conciliação |  
| Observabilidade | Logs, métricas e alertas | Detectar falhas e medir produto |  
| Hospedagem | Cloud gerenciada | Menos operação no início |  
  
## 10. Ordem de construção  
  
### Sprint 1 — Fundação  
  
- Cadastro e login.  
- Papéis de cliente e prestador.  
- Perfil básico do prestador.  
- Categorias.  
- Upload de fotos.  
- Painel administrativo básico.  
  
### Sprint 2 — Solicitação e matching  
  
- Criação de solicitação.  
- Matching por categoria, bairro e disponibilidade.  
- Oportunidades.  
- Notificação por WhatsApp.  
- Aceite e recusa.  
- Liberação de contato.  
  
### Sprint 3 — Confiança  
  
- Avaliação.  
- Nota composta.  
- Perfil público.  
- Portfólio.  
- Verificação básica.  
- Denúncias.  
  
### Sprint 4 — Monetização  
  
- Planos.  
- Assinatura recorrente.  
- Limites por plano.  
- Painel financeiro.  
- Cobrança, inadimplência e cancelamento.  
  
### Sprint 5 — Diferenciais  
  
- Recompra do mesmo profissional.  
- “Meus profissionais de confiança”.  
- Indicação de substituto.  
- Registro de indicações.  
  
### Sprint 6 — Apadrinhamento  
  
- Elegibilidade.  
- Painel do padrinho.  
- Selo de indicação.  
- Acompanhamento do iniciante.  
- Regras de penalidade.  
  
## 11. Critérios de aceite técnicos  
  
O esqueleto estará funcionando quando:  
  
- Um usuário puder ser cliente e prestador.  
- Um cliente criar solicitação com fotos, bairro e urgência.  
- O sistema encontrar prestadores compatíveis.  
- O prestador receber notificação no WhatsApp.  
- O prestador aceitar a oportunidade.  
- O cliente autorizar e receber o contato.  
- O cliente recontratar o mesmo profissional.  
- O prestador indicar substituto quando indisponível.  
- O cliente avaliar o serviço.  
- O score do prestador mudar após avaliação.  
- A assinatura ser cobrada, renovada e cancelada corretamente.  
- O administrador aprovar cadastros e mediar denúncias.  
  
## 12. Decisões que evitam retrabalho  
  
- Comece com **uma cidade**, poucas categorias e um raio de atendimento simples.  
- Não construa chat interno no MVP; use WhatsApp como canal inicial.  
- Não processe pagamento do serviço no MVP; foque na assinatura do prestador.  
- Não permita compra de estrelas ou reputação.  
- Registre snapshots de dados em cada solicitação e atendimento.  
- Faça o matching explicável: o prestador deve entender por que recebeu ou não recebeu oportunidades.  
- Separe “oportunidade recebida” de “contato liberado” e “serviço concluído”.  
- Planeje desde o início consentimentos separados para marketing, compartilhamento com substituto e uso de fotos.  
  
Esse esqueleto já cobre o produto completo: conexão, confiança, reputação, assinatura, recompra, indicação e apadrinhamento. A próxima etapa natural é transformá-lo em **histórias de usuário com critérios de aceite**, tela por tela, para entregar a uma equipe de desenvolvimento ou usar como base de protótipo.  
  
Fontes  
[1] How to Build a Two-Sided Marketplace Without Code in 2026 - Creatr https://getcreatr.com/build-marketplace-app-without-code  
[2] How to Develop a Multi-Vendor Digital Product Marketplace https://www.abbacustechnologies.com/how-to-develop-a-multi-vendor-digital-product-marketplace/  
[3] www.abbacustechnologies.com › best-developmentBest Development Approach for a Multi-Vendor Marketplace https://www.abbacustechnologies.com/best-development-approach-for-a-multi-vendor-marketplace/  
[4] Payments API - Brazil https://developers.facebook.com/docs/whatsapp/cloud-api/payments-api/payments-br  
[5] Payments API - Brazil - Meta for Developers https://developers.facebook.com/documentation/business-messaging/whatsapp/payments/payments-br/overview/  
[6] Stripe + WhatsApp: payments and subscriptions | Vectalk https://vectalk.com.br/blog/en/stripe-whatsapp-business-api/  
[7] How to Design a Postgres Schema for a Marketplace App (2026) https://jishulabs.com/blog/how-to-design-a-postgres-schema-for-a-marketplace-2026  
[8] System Design: Two-Sided Marketplace - Algoroq https://www.algoroq.io/system-design/design-marketplace-platform/  
[9] Plataforma comercial https://whatsappbusiness.com/pt-br/products/business-platform/?lang=pt_BR  
[10] WhatsApp Business API Brazil | Pix, LGPD & BACEN Compliant https://www.messagecentral.com/services/whatsapp-business-api/brazil  
[11] WhatsApp Business API Brazil https://www.interakt.shop/whatsapp-business-api-brazil/  
[12] Full Stack Multi-User Marketplace https://www.freelancer.com/projects/full-stack-development/Full-Stack-Multi-User-Marketplace  
[13] How to Build Custom Peer-to-Peer Marketplace Apps? https://www.abbacustechnologies.com/how-to-build-custom-peer-to-peer-marketplace-apps/  
[14] WhatsApp for SaaS: onboarding, activation, churn | Vectalk https://vectalk.com.br/blog/en/whatsapp-for-saas/  
[15] DynamoDB Schema Pattern: Marketplace (Two-Sided) https://singletable.dev/blog/pattern-marketplace/  
