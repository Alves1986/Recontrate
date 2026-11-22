# Plano de Resposta a Incidentes de Segurança e Dados Pessoais (LGPD / Resolução CD/ANPD nº 15/2024)

**Plataforma:** Recontrate  
**Normas aplicáveis:** Lei nº 13.709/2018 (LGPD, art. 48) e Regulamento de Comunicação de Incidente de Segurança (Resolução CD/ANPD nº 15/2024).

---

## 1. Critério de Obrigatoriedade de Comunicação

Sempre que ocorrer incidente de segurança confirmado ou com forte indício de que possa acarretar **risco ou dano relevante aos titulares** — conforme os critérios da Resolução CD/ANPD nº 15/2024 (larga escala, dados sensíveis, dados de crianças/adolescentes, dados financeiros/autenticação, comprometimento significativo de confidencialidade/integridade/disponibilidade) — é obrigatória a comunicação tempestiva:

1. À **Autoridade Nacional de Proteção de Dados (ANPD)** (via Peticionamento Eletrônico SEI / formulário oficial ANPD).
2. Aos **titulares de dados pessoais afetados**.

---

## 2. Prazos Legais Obrigatórios (Contagem em Dias Úteis)

| Etapa | Prazo Máximo | Referência Normativa |
| --- | --- | --- |
| Contenção imediata e escalonamento ao Encarregado (DPO) | **Imediato (até 4 horas)** da ciência | Playbook interno |
| Comunicação inicial à **ANPD** | **Até 3 (três) dias úteis** contados do conhecimento do incidente | Resolução CD/ANPD nº 15/2024, art. 6º |
| Comunicação direta aos **titulares afetados** | **Até 3 (três) dias úteis** contados do conhecimento do incidente | Resolução CD/ANPD nº 15/2024, art. 6º e art. 9º |
| Complementação de informações (se comunicação inicial foi preliminar) | **Até 20 (vinte) dias úteis** a contar da comunicação inicial | Resolução CD/ANPD nº 15/2024, art. 6º §3º |
| Guarda do registro interno do incidente (mesmo os não comunicáveis) | **Mínimo de 5 (cinco) anos** | Resolução CD/ANPD nº 15/2024, art. 10 |

> **Observação para agentes de pequeno porte (se aplicável conforme Resolução CD/ANPD nº 2/2022):** mesmo que aplicável prazo em dobro em cenários específicos, a meta operacional padrão do Recontrate é cumprir integralmente o prazo de **3 dias úteis**.

---

## 3. Fluxo Operacional de Resposta (4 Fases)

### Fase A — Detecção e Triagem (0h – 4h)
1. Identificar origem: vazamento em banco Neon PostgreSQL, comprometimento de `SESSION_SECRET`, falha de RLS, exposição em Neon Object Storage/S3, comprometimento de webhooks/Asaas/Resend ou abuso de endpoints.
2. Registrar timestamp exato em UTC da ciência do incidente (`conhecimento_em_utc`) para contagem dos 3 dias úteis.
3. Escalonar ao Encarregado pelo Tratamento de Dados Pessoais (**DPO**) definido via `VITE_DPO_EMAIL`.

### Fase B — Contenção e Erradicação (Imediata)
1. Revogar sessões e rotacionar segredos afetados (`SESSION_SECRET`, chaves Neon, `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN`, `RESEND_API_KEY`).
2. Bloquear contas comprometidas (`status = 'suspenso'`) e preservar evidências em `audit_logs` e backups imutáveis (`Neon Point-in-Time Restore`).
3. Corrigir vulnerabilidade raiz em branch auditada e aplicar deploy emergencial.

### Fase C — Comunicação à ANPD e aos Titulares (Até 3 dias úteis)
Conteúdo mínimo exigido pela Resolução CD/ANPD nº 15/2024:
- Identificação e contato do Controlador (`VITE_COMPANY_NAME`, `VITE_COMPANY_CNPJ`, endereço) e do Encarregado/DPO (`VITE_DPO_NAME`, `VITE_DPO_EMAIL`).
- Data e hora do incidente e do seu conhecimento.
- Descrição dos dados pessoais afetados (natureza e categoria dos dados e dos titulares).
- Quantidade estimada de titulares afetados e se envolve crianças/adolescentes ou grupos vulneráveis.
- Medidas técnicas e de segurança aplicadas antes e após o incidente para contenção e mitigação.
- Orientações claras em linguagem simples aos titulares (ex.: troca de senha, atenção a golpes de phishing/WhatsApp, revogação de credenciais).

### Fase D — Registro Histórico e Lições Aprendidas
1. Caso o incidente não gere risco/dano relevante aos titulares, documentar fundamentadamente a avaliação técnica e manter o registro arquivado pelo período mínimo de **5 anos** à disposição da ANPD.
2. Atualizar controles preventivos, testes automatizados (`phase1AuthAndRls.test.ts`, `phase3LegalCompliance.test.ts`) e política de retenção.
