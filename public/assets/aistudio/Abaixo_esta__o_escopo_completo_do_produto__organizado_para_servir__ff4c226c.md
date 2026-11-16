Abaixo está o **escopo completo do produto**, organizado para servir como base de desenvolvimento, apresentação a investidores e contrato com uma equipe técnica. O núcleo é um marketplace de serviços locais por assinatura, com rede de confiança, recompra do profissional, indicação de substituto e apadrinhamento auditável. A LGPD deve orientar a coleta e o compartilhamento de dados desde o início: finalidade específica, minimização de dados, transparência e consentimento revogável.[1][2][3]  
  
## 1. Visão do produto  
  
**Nome provisório:** a definir — sugestões: *Confiare*, *Indika*, *Servi+*, *Rede do Ofício* ou *Próximo Profissional*.  
  
**Proposta de valor:** conectar clientes a prestadores autônomos confiáveis na sua região, permitindo recontratar quem já fez um bom serviço e receber indicações rastreáveis quando esse profissional não estiver disponível.  
  
**Para o cliente:** menos risco, menos busca, mais confiança e continuidade com profissionais que já conhece.  
  
**Para o prestador:** visibilidade, oportunidades justas, ferramentas de posicionamento digital e reputação construída por desempenho — sem leilão de leads nem comissão sobre o valor do serviço.  
  
**Posicionamento:**  
  
> “Não é um app para achar qualquer profissional. É a rede de confiança que conecta você ao mesmo profissional de confiança — ou a quem ele indica.”  
  
## 2. Objetivos do produto  
  
### Objetivos de negócio  
  
- Criar receita recorrente por mensalidade de prestadores.  
- Reduzir o custo de aquisição de clientes por meio de recompra e indicações.  
- Formar uma base de prestadores verificados e bem avaliados.  
- Expandir primeiro por bairros/cidades, depois por categorias e regiões.  
- Diferenciar-se de plataformas de leads por previsibilidade, reputação e relacionamento.  
  
### Objetivos do cliente  
  
- Encontrar um profissional adequado com rapidez.  
- Ver sinais reais de confiança, não apenas uma nota.  
- Recontratar o mesmo profissional facilmente.  
- Receber uma alternativa confiável quando o profissional habitual não puder atender.  
- Manter o controle sobre preços, orçamento e decisão de contratação.  
  
### Objetivos do prestador  
  
- Receber oportunidades compatíveis com sua especialidade e área.  
- Construir reputação pública e presença digital.  
- Ter previsibilidade de custo mensal.  
- Crescer por qualidade, não apenas por pagar mais.  
- Ter autonomia para aceitar, recusar, negociar e indicar substitutos.  
  
## 3. Usuários e papéis  
  
| Papel | Função principal | Permissões essenciais |  
|---|---|---|  
| Cliente | Solicita e contrata serviços | Criar pedido, buscar prestadores, solicitar novamente, avaliar, receber indicações |  
| Prestador | Oferece serviço autônomo | Criar perfil, receber oportunidades, responder, indicar substitutos, acompanhar reputação |  
| Padrinho | Prestador experiente que apoia iniciantes | Indicar iniciantes, acompanhar indicados, receber selo/benefícios, responder por indicações |  
| Administrador | Opera a plataforma | Aprovar cadastros, mediar conflitos, gerenciar planos, acompanhar métricas |  
| Suporte/Moderação | Garante qualidade e segurança | Analisar denúncias, revisar avaliações, suspender contas, mediar disputas |  
| Financeiro | Controla assinaturas e cobranças | Emitir cobranças, acompanhar inadimplência, reembolsos e relatórios |  
  
## 4. Escopo funcional  
  
### 4.1 Cadastro e perfis  
  
**Cliente**  
  
- Cadastro por telefone, e-mail ou redes sociais.  
- Nome, telefone, endereço ou bairros de atendimento, foto opcional.  
- Histórico de solicitações e serviços.  
- Lista “Meus profissionais de confiança”.  
- Preferências: categorias favoritas, horários, raio de busca e forma de contato.  
- Central de privacidade: visualizar, corrigir e excluir dados; revogar consentimentos.  
  
**Prestador**  
  
- Cadastro com dados pessoais e profissionais.  
- Categoria principal e especialidades secundárias.  
- Áreas de atendimento por bairro, cidade ou raio em km.  
- Disponibilidade por dia, horário e urgência.  
- Telefone/WhatsApp, e-mail e foto.  
- Descrição profissional, anos de experiência e diferenciais.  
- Portfólio: fotos, vídeos curtos, antes/depois e descrição dos trabalhos.  
- Documentos para verificação: identidade, comprovante de endereço e, quando aplicável, registros profissionais.  
- Configuração de aceitar ou recusar oportunidades.  
- Configuração de férias, folga e indisponibilidade temporária.  
  
### 4.2 Perfil público do prestador  
  
O perfil é a “vitrine” do prestador e deve funcionar também como uma página pública otimizada para busca local.  
  
Deve conter:  
  
- Nome profissional, foto, categoria e especialidades.  
- Nota composta e número de atendimentos.  
- Selo “Verificado”, quando aplicável.  
- Selo “Indicado por [padrinho]”.  
- Selo “Top na região”, quando aplicável.  
- Área de atendimento.  
- Portfólio visual.  
- Avaliações detalhadas.  
- Tempo médio de resposta.  
- Taxa de resposta e comparecimento.  
- Botão “Solicitar orçamento” ou “Falar no WhatsApp”.  
- Link público compartilhável.  
- Versão otimizada para mecanismos de busca, com título, descrição, schema e palavras-chave locais.  
  
### 4.3 Criação de solicitação de serviço  
  
O cliente informa:  
  
- Categoria do serviço.  
- Descrição do problema ou necessidade.  
- Fotos, vídeos ou áudio opcionais.  
- Endereço aproximado ou bairro.  
- Urgência: hoje, amanhã, esta semana ou flexível.  
- Horário preferencial.  
- Orçamento aproximado, opcional.  
- Preferência por profissional anterior, se houver.  
- Autorização para o prestador entrar em contato.  
  
A plataforma não define nem impõe preço. O prestador negocia diretamente com o cliente; a plataforma fornece modelos de orçamento e registra o escopo combinado, se o cliente autorizar.  
  
### 4.4 Matching e distribuição de oportunidades  
  
O sistema deve cruzar:  
  
- Categoria e especialidade.  
- Bairro, cidade ou raio de atendimento.  
- Disponibilidade e urgência.  
- Reputação e taxa de resposta.  
- Plano do prestador.  
- Capacidade de atendimento no período.  
- Histórico de recusas e cancelamentos.  
- Preferências do cliente.  
  
**Regra de justiça:** o plano pago aumenta prioridade e limite de oportunidades, mas não deve monopolizar o fluxo. A plataforma deve distribuir oportunidades entre prestadores compatíveis, evitando que os mesmos profissionais recebam tudo.  
  
**Prioridade sugerida:**  
  
\[  
\text{Prioridade} = \text{compatibilidade} + \text{disponibilidade} + \text{reputação} + \text{bônus do plano} - \text{penalidades}  
\]  
  
O bônus do plano nunca pode substituir reputação ou qualidade.  
  
### 4.5 Notificações e resposta  
  
- Notificação por push, e-mail e WhatsApp.  
- A oportunidade mostra: tipo de serviço, bairro aproximado, urgência, descrição e fotos autorizadas.  
- O prestador pode aceitar interesse, recusar ou ignorar.  
- Ao demonstrar interesse, ele recebe acesso ao contato do cliente conforme as regras do plano e o consentimento do cliente.  
- O cliente recebe o nome, perfil e avaliação do prestador antes de liberar o contato.  
- Tempo limite configurável para resposta, por exemplo 15, 30 ou 60 minutos.  
- Se ninguém responder, a plataforma amplia o raio ou aciona outros prestadores.  
  
### 4.6 Recompra do mesmo profissional  
  
Funcionalidade central: **“Solicitar novamente”**.  
  
Fluxo:  
  
1. O cliente acessa “Meus serviços”.  
2. Seleciona o profissional anterior.  
3. Clica em “Solicitar novamente”.  
4. Escolhe o tipo de serviço, data e urgência.  
5. A plataforma envia uma solicitação direta ao profissional.  
6. O profissional aceita ou recusa dentro de um prazo.  
7. Se aceitar, o contato é liberado.  
8. Se recusar ou não responder, o cliente pode pedir indicação de substituto.  
  
O sistema deve preservar o histórico do serviço: data, categoria, descrição, fotos, avaliação e observações do cliente — sempre com consentimento e controle de privacidade.  
  
### 4.7 Indicação de substituto  
  
Quando o profissional anterior não puder atender, ele poderá:  
  
- Recusar sem indicação.  
- Indicar até 2 profissionais confiáveis.  
- Indicar um apadrinhado, se houver.  
- Indicar um colega da mesma rede ou categoria.  
- Escrever um breve motivo: “está de folga”, “não atende essa especialidade”, “está longe”, etc.  
  
O cliente verá:  
  
- “O João não pode atender, mas indica o Carlos.”  
- Perfil, nota, selos e portfólio do indicado.  
- Motivo da indicação.  
- Opção de aceitar a indicação ou buscar outros profissionais.  
  
A indicação deve ser registrada e influenciar a reputação de ambos: o indicador ganha confiança se as indicações forem boas; perde credibilidade se indicar profissionais ruins repetidamente.  
  
### 4.8 Apadrinhamento  
  
O apadrinhamento é uma **rede de mentoria e credibilidade**, não um esquema de comissão ilimitada.  
  
**Requisitos para ser padrinho**  
  
- Tempo mínimo na plataforma, por exemplo 6 meses.  
- Mínimo de atendimentos concluídos.  
- Nota mínima, por exemplo 4,6.  
- Baixa taxa de reclamações e cancelamentos.  
- Perfil verificado.  
- Aceite dos termos do programa.  
  
**Funções do padrinho**  
  
- Indicar iniciantes da mesma categoria e região.  
- Acompanhar as primeiras demandas do indicado.  
- Orientar sobre perfil, fotos, portfólio, resposta e atendimento.  
- Indicar o apadrinhado como substituto quando não puder atender.  
- Receber selo “Padrinho Verificado”.  
  
**Regras de responsabilidade**  
  
- O padrinho não pode indicar parentes ou amigos sem declaração de vínculo.  
- Cada padrinho tem limite de indicados ativos.  
- O selo do padrinho pode ser suspenso se os indicados tiverem má reputação.  
- O indicado ganha reputação própria após atingir um número mínimo de atendimentos bem avaliados.  
- Benefícios do padrinho: visibilidade, prioridade moderada, destaque no perfil e desconto na mensalidade — não compra de estrelas.  
  
### 4.9 Reputação e estrelas  
  
A nota não deve ser uma média simples. Ela deve combinar qualidade percebida e comportamento na plataforma.  
  
**Componentes sugeridos**  
  
- Avaliações dos clientes: 40%.  
- Tempo médio de resposta: 20%.  
- Taxa de resposta: 20%.  
- Atendimentos concluídos: 10%.  
- Verificações e completude do perfil: 10%.  
  
**Regras**  
  
- Avaliação só pode ser feita por cliente com solicitação registrada.  
- Avaliações devem ter período para resposta do prestador.  
- Denúncias podem ocultar temporariamente avaliações suspeitas até análise.  
- O prestador pode responder publicamente à avaliação.  
- Estrelas não podem ser compradas, trocadas por dinheiro ou garantidas por plano pago.  
- O plano pode melhorar visibilidade, mas nunca a nota.  
  
### 4.10 Planos e assinaturas  
  
| Plano | Público | Recursos |  
|---|---|---|  
| **Essencial** | Iniciante | Perfil público, até 10 oportunidades/mês, WhatsApp, avaliações, área de atendimento |  
| **Profissional** | Prestador ativo | Até 40 oportunidades/mês, prioridade média, portfólio ampliado, estatísticas básicas, destaque regional |  
| **Premium** | Prestador estabelecido | Oportunidades ilimitadas dentro do raio/categoria, prioridade alta, destaque, relatórios avançados, suporte prioritário |  
| **Padrinho** | Prestador experiente | Recursos do Premium + selo de padrinho + ferramentas de indicação e acompanhamento |  
  
**Regras comerciais**  
  
- Cobrança mensal por Pix, cartão ou boleto.  
- Período de teste opcional, por exemplo 7 ou 14 dias.  
- Cancelamento a qualquer momento, sem multa.  
- Renovação automática com aviso prévio.  
- Política clara sobre reembolso.  
- Plano não garante quantidade mínima de clientes nem receita.  
- A plataforma garante oportunidades compatíveis, ferramentas e visibilidade — não contratação.  
  
### 4.11 Ferramentas de posicionamento digital  
  
Este é um diferencial importante para autônomos que não sabem se posicionar.  
  
Incluir:  
  
- Assistente de criação de perfil profissional.  
- Sugestão de descrição por categoria.  
- Checklist de fotos e portfólio.  
- Geração de link público para WhatsApp.  
- Solicitação automática de avaliação após o serviço.  
- Dicas de SEO local.  
- Modelo de resposta para orçamento.  
- Relatório mensal de desempenho.  
- Alertas: “seu perfil está incompleto”, “você demora para responder”, “adicione fotos dos últimos serviços”.  
  
### 4.12 Pagamentos e negociação  
  
No MVP, a negociação de preço e o pagamento do serviço podem ocorrer fora da plataforma, por acordo entre cliente e prestador.  
  
A plataforma deve registrar:  
  
- Escopo do serviço.  
- Data e horário combinados.  
- Valor estimado ou acordado, se ambos informarem.  
- Confirmação de conclusão.  
- Avaliação.  
- Eventual reclamação.  
  
Em uma fase posterior, pode-se oferecer pagamento pela plataforma, sinal, parcelamento, nota fiscal e garantia — mas isso aumenta complexidade jurídica, fiscal e operacional.  
  
### 4.13 Segurança, disputas e moderação  
  
- Denúncia de perfil, serviço ou avaliação.  
- Bloqueio de usuário.  
- Suspensão temporária ou permanente.  
- Mediação de conflitos.  
- Registro de histórico de reclamações.  
- Verificação de documentos.  
- Detecção básica de fraude: mesmo telefone, mesmo endereço, avaliações recíprocas suspeitas, padrões anormais de cancelamento.  
- Política de conteúdo para fotos, textos e avaliações.  
- Canal de suporte humano.  
  
## 5. Escopo do MVP  
  
O MVP deve ser pequeno, rápido de validar e focado em uma cidade e poucas categorias.  
  
### MVP inclui  
  
- Cadastro de cliente e prestador.  
- Perfil público do prestador.  
- Criação de solicitação de serviço.  
- Matching básico por categoria, bairro e disponibilidade.  
- Notificação por WhatsApp.  
- Demonstração de interesse e liberação de contato.  
- Recompra do mesmo profissional.  
- Indicação de até 2 substitutos.  
- Avaliação pós-atendimento.  
- Nota composta simples.  
- Planos Essencial, Profissional e Premium.  
- Cobrança recorrente.  
- Painel do prestador.  
- Painel administrativo básico.  
- Termos de uso, política de privacidade e consentimentos LGPD.  
  
### MVP não inclui ainda  
  
- Aplicativo nativo completo para iOS e Android.  
- Pagamento do serviço dentro da plataforma.  
- Chat interno completo.  
- IA avançada de precificação.  
- Garantia financeira ampla.  
- Expansão nacional.  
- Dezenas de categorias.  
- Programa de franquia.  
- Integrações complexas com ERPs.  
  
## 6. Jornadas principais  
  
### Cliente encontra um profissional  
  
1. Cliente se cadastra.  
2. Escolhe a categoria.  
3. Descreve o serviço e anexa fotos.  
4. Informa bairro e urgência.  
5. Sistema identifica prestadores compatíveis.  
6. Cliente vê perfis, notas e selos.  
7. Prestador responde.  
8. Cliente escolhe e conversa pelo WhatsApp.  
9. Após o serviço, avalia o prestador.  
  
### Cliente recontrata o mesmo profissional  
  
1. Cliente abre “Meus serviços”.  
2. Seleciona o profissional anterior.  
3. Clica em “Solicitar novamente”.  
4. Sistema envia pedido direto.  
5. Profissional aceita.  
6. Contato é liberado.  
7. Serviço é realizado.  
8. Cliente avalia novamente.  
  
### Profissional indica substituto  
  
1. Cliente solicita o profissional anterior.  
2. Profissional não pode atender.  
3. Plataforma pergunta se deseja indicar alguém.  
4. Profissional escolhe até 2 substitutos.  
5. Cliente recebe a indicação.  
6. Cliente aceita ou busca outra opção.  
7. A indicação é registrada na reputação dos dois profissionais.  
  
### Iniciante entra na rede  
  
1. Iniciante se cadastra.  
2. Plataforma identifica que ele não tem histórico suficiente.  
3. Sistema sugere buscar um padrinho.  
4. Padrinho analisa o perfil.  
5. Padrinho aceita apadrinhar.  
6. Iniciante recebe selo “Indicado por”.  
7. Padrinho acompanha os primeiros atendimentos.  
8. Após bons resultados, o iniciante ganha reputação própria.  
  
## 7. Regras de negócio importantes  
  
- O prestador é autônomo e define seu preço.  
- A plataforma não garante contratação, apenas oportunidade, visibilidade e ferramentas.  
- O cliente decide se contrata, mesmo após indicação.  
- A indicação de substituto é opcional.  
- O padrinho não pode comprar reputação para o indicado.  
- Estrelas nunca podem ser adquiridas.  
- O plano pago aumenta prioridade, mas não elimina a fila justa.  
- O cliente deve autorizar o compartilhamento de dados com o substituto.  
- Toda cobrança deve ter aviso prévio de renovação.  
- Denúncias graves podem suspender o perfil imediatamente.  
  
## 8. Dados e privacidade  
  
A plataforma tratará dados pessoais de clientes e prestadores, então deve adotar minimização, finalidade específica, transparência e segurança. O consentimento deve ser livre, informado e específico, sem autorizações genéricas; o titular deve poder revogá-lo e solicitar eliminação dos dados, observadas as exceções legais.[1][2][3][4]  
  
**Dados do cliente**  
  
- Nome, telefone, e-mail, endereço aproximado.  
- Descrição do serviço e fotos.  
- Histórico de solicitações.  
- Avaliações.  
- Preferências de contato.  
  
**Dados do prestador**  
  
- Nome, documentos, contato, endereço de atendimento.  
- Categoria, especialidades e área de cobertura.  
- Portfólio e avaliações.  
- Histórico de oportunidades, respostas e atendimentos.  
- Dados de cobrança.  
  
**Compartilhamento**  
  
- O contato do cliente só é liberado após demonstração de interesse e consentimento.  
- Dados para substituto só são compartilhados com autorização do cliente.  
- Dados sensíveis não devem ser coletados sem necessidade.  
- Documentos de verificação devem ter acesso restrito.  
  
## 9. Métricas de sucesso  
  
### Para o cliente  
  
- Tempo até o primeiro contato.  
- Taxa de solicitações atendidas.  
- Taxa de recompra.  
- Nota média dos prestadores.  
- Taxa de reclamações.  
- Retenção de clientes após o primeiro serviço.  
  
### Para o prestador  
  
- Oportunidades recebidas por mês.  
- Taxa de resposta.  
- Tempo médio de resposta.  
- Contatos iniciados.  
- Serviços fechados, quando informados.  
- Nota média.  
- Renovação da assinatura.  
- Cancelamento por insatisfação.  
  
### Para o negócio  
  
- Novos prestadores ativos por mês.  
- Novos clientes ativos por mês.  
- Receita recorrente mensal.  
- Churn de assinaturas.  
- Custo de aquisição por prestador.  
- Custo de aquisição por cliente.  
- Proporção de oportunidades respondidas.  
- Proporção de serviços concluídos.  
- Número de indicações aceitas.  
- Número de recompras.  
  
## 10. Arquitetura sugerida  
  
Para começar, use uma arquitetura simples e escalável:  
  
- **Front-end:** web responsivo primeiro; app posteriormente.  
- **Back-end:** API modular com cadastro, matching, notificações, assinaturas, avaliações e administração.  
- **Banco de dados:** relacional para usuários, perfis, serviços, planos e avaliações.  
- **Armazenamento:** nuvem para fotos, vídeos e documentos.  
- **Notificações:** WhatsApp Business API, push e e-mail.  
- **Pagamentos:** gateway de assinaturas recorrentes.  
- **Mapas e localização:** API de geocodificação e cálculo de raio.  
- **Analytics:** eventos de cadastro, oportunidade, resposta, contato, avaliação e renovação.  
- **Segurança:** autenticação, criptografia, controle de acesso, logs e backups.  
  
## 11. Fases de desenvolvimento  
  
### Fase 1 — Fundação  
  
- Identidade visual e nome.  
- Termos de uso e política de privacidade.  
- Cadastro de cliente e prestador.  
- Perfil do prestador.  
- Criação de solicitação.  
- Matching básico.  
- Notificação por WhatsApp.  
- Avaliação simples.  
- Painel administrativo.  
  
### Fase 2 — Confiança e monetização  
  
- Verificação de prestadores.  
- Planos e cobrança recorrente.  
- Nota composta.  
- Portfólio.  
- Relatórios do prestador.  
- Ferramentas de posicionamento digital.  
- Moderação e denúncias.  
  
### Fase 3 — Rede de relacionamento  
  
- Recompra do mesmo profissional.  
- “Meus profissionais de confiança”.  
- Indicação de substituto.  
- Registro de indicações.  
- Métricas de indicação.  
  
### Fase 4 — Apadrinhamento  
  
- Regras de elegibilidade.  
- Painel do padrinho.  
- Selo de indicação.  
- Acompanhamento do iniciante.  
- Penalidades e revisão de selos.  
- Programa de benefícios.  
  
### Fase 5 — Escala  
  
- Novas cidades.  
- Novas categorias.  
- Aplicativo nativo.  
- Chat interno.  
- Pagamento e garantia.  
- Inteligência artificial para matching e qualidade.  
- Programa de parcerias locais.  
  
## 12. Riscos e mitigações  
  
| Risco | Impacto | Mitigação |  
|---|---|---|  
| Prestador paga e não recebe oportunidades | Cancelamento e má reputação | Fila justa, metas transparentes, acompanhamento e limites claros |  
| Cliente não confia em iniciante | Baixa conversão | Apadrinhamento, verificação e perfil completo |  
| Padrinho indica amigos ruins | Perda de confiança | Limite de indicações, vínculo declarado e penalidades |  
| Cliente não encontra o mesmo profissional | Frustração | Indicação de substituto e histórico de profissionais |  
| Fraude em avaliações | Reputação falsa | Avaliações vinculadas a serviço real, moderação e detecção de padrões |  
| Dados compartilhados sem consentimento | Risco jurídico | Consentimento granular, LGPD e controle de acesso |  
| Concorrência por preço | Guerra de preços | Diferenciação por confiança, reputação e posicionamento digital |  
  
## 13. Critérios de aceite do MVP  
  
O MVP estará pronto quando:  
  
- Um cliente conseguir criar uma solicitação em menos de 2 minutos.  
- Um prestador conseguir completar o perfil em menos de 10 minutos.  
- O sistema enviar oportunidade compatível por WhatsApp.  
- O prestador conseguir demonstrar interesse e receber contato autorizado.  
- O cliente conseguir solicitar novamente o mesmo profissional.  
- O prestador conseguir indicar até 2 substitutos.  
- O cliente conseguir avaliar o serviço.  
- O administrador conseguir aprovar, suspender e acompanhar contas.  
- A cobrança recorrente funcionar.  
- A plataforma registrar oportunidades, respostas, contatos, avaliações e assinaturas.  
  
## 14. Próximos entregáveis  
  
Para transformar este escopo em projeto executável, os próximos documentos devem ser:  
  
1. **Documento de requisitos funcionais**, com histórias de usuário e critérios de aceite.  
2. **Mapa de telas**, para cliente, prestador, padrinho e administrador.  
3. **Modelo de dados**, com entidades, relacionamentos e regras.  
4. **Fluxogramas**, especialmente de matching, recompra, indicação e apadrinhamento.  
5. **Tabela de planos e preços**, com testes de disposição a pagar.  
6. **Manual de moderação**, com regras de suspensão, denúncia e mediação.  
7. **Roteiro de validação**, com 20 a 30 prestadores e 30 a 50 clientes em uma região-piloto.  
  
O ponto central é não construir tudo de uma vez. Lance primeiro a **conexão confiável + recompra + indicação de substituto**, valide se prestadores renovam a assinatura e se clientes voltam a contratar; depois, adicione o apadrinhamento como camada de crescimento e credibilidade.  
  
Fontes  
[1] Perguntas e Respostas Frequentes sobre LGPD https://www.gov.br/mdr/pt-br/acesso-a-informacao/perguntas-frequentes/perguntas-e-respostas-frequentes-sobre-lgpd  
[2] Aplicação da Lei geral de proteção de dados pessoais (LGPD ... https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_lgpd_final.pdf/@@display-file/file  
[3] COMO PROTEGER SEUS DADOS PESSOAIS - gov.br https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-do-consumidor_como-proteger-seus-dados-pessoais-final.pdf/@@download/file  
[4] Privacidade e Proteção de Dados Pessoais - Portal Gov.br https://www.gov.br/mec/pt-br/acesso-a-informacao/perguntas-frequentes/privacidade-e-protecao-de-dados-pessoais  
[5] Lei Geral de Proteção de Dados Pessoais (LGPD) - GOV https://www.gov.br/mds/pt-br/acesso-a-informacao/governanca/integridade/campanhas/lgpd  
[6] Perguntas Frequentes http://www.gov.br/anpd/pt-br/acesso-a-informacao/perguntas-frequentes/perguntas-frequentes  
[7] LGPD - gov.br https://www.gov.br/mme/pt-br/arquivos/legislacao-consolidada-lgpd.pdf  
[8] [PDF] Presidência da República - Portal Gov.br https://www.gov.br/hfa/pt-br/acesso-a-informacao/encarregado-pelo-tratamento-de-dados-pessoais-dpo/lgpd_13-709_2026.pdf/@@display-file/file  
[9] Perguntas Frequentes sobre a LGPD e atuação da Agência ... https://www.gov.br/dnit/pt-br/acesso-a-informacao/tratamento-de-dados-pessoais/perguntas-frequentes-sobre-a-lgpd-e-atuacao-da-agencia-nacional-de-protecao-de-dados-anpd  
[10] Hipóteses legais de tratamento de dados pessoais https://www.gov.br/anpd/pt-br/documentos-e-publicacoes/guia_legitimo_interesse.pdf/@@display-file/file  
[11] Perguntas Frequentes - ANPD - Portal Gov.br http://www.gov.br/anpd/pt-br/perguntas-frequentes.pdf/@@display-file/file  
[12] Tratamento de dados pessoais pelo Poder Público https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-poder-publico-anpd-versao-final.pdf/@@download/file  
[13] LGPD - gov.br https://www.gov.br/mme/pt-br/arquivos/legislacao-consolidada-lgpd.pdf/@@download/file  
[14] Perguntas Frequentes – ANPD - gov.br https://www.gov.br/anpd/pt-br/centrais-de-conteudo/201105-faq-anpd-finalrev.pdf/@@download/file  
[15] LGPD – LGPD https://lgpd.cbm.df.gov.br/lgpd/  
