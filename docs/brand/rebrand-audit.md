# Auditoria pré-rebranding — Recontrate

**Data:** 2026-11-17
**Escopo:** identidade visual e revisão do conteúdo público.
**Branch local:** `rebrand/recontrate-visual-identity` (derivada de `main`, commit-base `6e5688a`).
**Remoto:** nenhuma alteração, push ou publicação efetuada.

## Estado inicial

- Stack identificada: React 19, TypeScript, Vite, Tailwind CSS 4 e Express; dependências do projeto instaladas localmente com `npm ci`.
- `npm run lint` (TypeScript `tsc --noEmit`): aprovado no estado inicial.
- Teste isolado `npx tsx --test src/services/pwaMobileLogin.test.ts`: 5 aprovados no estado inicial.
- `npm run build`: bloqueado antes da compilação porque o ambiente local não dispõe da configuração necessária do Neon. Nenhum segredo foi impresso ou criado.
- Suíte completa não executada: testes de integração chamam `ensureSchemaAndSeed()` e fazem operações com banco de dados; não foi autorizado tocar em dados.

## Ativos de marca encontrados

- A pasta compartilhada do projeto contém `IMG_4307.JPG`, prancha de referências com três direções de marca para Recontrate. É uma imagem rasterizada com mais de uma proposta, não um arquivo vetorial aprovado.
- No clone GitHub existem `src/components/ConfiareLogo.tsx`, `public/icons/icon.svg` e imagens JPG antigas com o logotipo Confiare. Esses ativos não são vetores finais de Recontrate.
- Até aprovação de um símbolo, a interface deve usar apenas um wordmark tipográfico provisório. Foram preparados caminhos editáveis em `docs/brand/recontrate-logo-proposals.svg` para avaliação; não devem ser usados como marca final sem aprovação.

## Ocorrências visíveis e técnicas

As superfícies públicas e autenticadas que exibiam a marca incluem `src/App.tsx`, home, páginas públicas, planos, cadastro/login, perfil, telas de solicitação, substituição/avaliação, painel do prestador, taxonomia e showcase de demonstração. Metadados públicos estão em `index.html`, `metadata.json` e `public/manifest.webmanifest`.

Foram identificados contatos antigos no rodapé público e um e-mail de exemplo pré-preenchido no cadastro de prestador. Não há contato oficial configurado no repositório; o rodapé deve omitir o contato até existir configuração controlada pelo projeto.

**Identificadores preservados por segurança:** caminhos/imports técnicos como `src/types/confiare.ts`, nomes de cookies/sessões, emissor JWT, variáveis de ambiente, nomes de tabelas, roles PostgreSQL, buckets, chaves de webhooks, slugs/IDs de planos, integrações de e-mail/WhatsApp/Asaas/Neon, URLs de callback e nomes de campos. O nome visível pode mudar sem renomear esses identificadores nesta etapa.

## Integridade de conteúdo

A home inclui exemplos com nomes, avaliações, tempos médios, contagens de prestadores e bairros que podem vir de dados de demonstração ou valores padrão. A revisão deve remover ou rotular claramente os exemplos fictícios e não apresentar métricas de seed como prova real. A faixa de demonstração existente deve continuar explícita.

## Condições de entrega

Trabalho somente local na branch acima. Não alterar preços, regras comerciais, banco, permissões ou integrações. Não enviar mensagens, não iniciar cobranças, não registrar domínios/redes, não fazer push e não publicar.


## Resultado final desta etapa

- Nome público: **Recontrate** como nome provisório; o wordmark tipográfico é temporário. Foram preparados dois estudos vetoriais editáveis em `docs/brand/recontrate-logo-proposals.svg`, inspirados na referência rasterizada. Nenhum deles foi aplicado como símbolo final.
- Identidade aplicada com tokens centralizados para a paleta solicitada, tipografia Manrope/fallback existente, estados e cores de interface. O tom coral para texto sobre fundo verde foi ajustado para `#F19973` (contraste calculado de 5,57:1 sobre `#123B3A`). Botões terracota `#A94727` com texto branco têm 5,80:1; links `#24665F` sobre branco, 6,69:1; texto `#17212B` sobre fundo areia, 14,48:1.
- A landing recebeu o título e subtítulo propostos, o formulário de busca não presume bairro/cidade, e afirmações genéricas de verificação/prova social foram substituídas por descrições condicionais. Perfis e pontuações agora omitem métricas quando os dados não estão disponíveis; o cadastro de prestador não começa preenchido com pessoa, contato, mentor, documentos ou plano pagos fictícios.
- O contato público é opcional via `VITE_PUBLIC_CONTACT`; só é mostrado se for um e-mail válido. Sem variável configurada, o rodapé não renderiza contato.
- Os textos de marca em avisos e descrições de cobrança foram atualizados no código. Nenhuma mensagem foi enviada e nenhuma cobrança foi iniciada. O preço, ciclo, ID/slug de plano e regras de assinatura não foram alterados. O dado de completude foi acrescentado somente à projeção de leitura pública de perfis; nenhuma tabela ou registro foi modificado.
- Estado verificado: `npm run lint` aprovado; testes unitários de PWA e regras do marketplace, 10/10 aprovados; `npm run build` aprovado com valores sintéticos locais para satisfazer a inicialização do plugin Neon, sem conectar ao banco nem a integrações. O build reporta avisos de configuração Vite futura e de bundle acima de 500 kB. Testes que importam serviços ligados ao Neon e a suíte de integração não foram executados por não haver ambiente Neon autorizado/configurado.
- Capturas estáticas locais: `docs/brand/previews/recontrate-desktop.png`, `recontrate-tablet.png` e `recontrate-mobile.png`. A rota raiz no viewport mobile apresenta a tela de login por uma regra anterior de login móvel; essa lógica de autenticação foi mantida. No tablet, as ações de acesso ficam na primeira linha e todas as rotas de navegação na segunda, evitando corte dos botões.
- Pendências antes de produção: escolher/aprovar um dos símbolos ou enviar vetor oficial; confirmar disponibilidade jurídica do nome separadamente; configurar `VITE_PUBLIC_CONTACT`; confirmar domínio remetente, links antigos de ferramentas sob `fornecedores.confiare.com.br`, remetente de e-mail e demais referências técnicas antes de renomear/migrar domínios; decidir se visitante mobile deve ver a landing antes do login.
- Nenhum push, deploy, publicação, migração de banco, registro de domínio/rede, chamada a gateway, envio de mensagem ou alteração remota foi feito.


Na última revisão visual, também foram substituídos os rótulos públicos que revelavam o fornecedor de autenticação por “Acesso seguro” e “Entrar com Google”. Os handlers e o provedor técnico continuam intactos.


**Bloqueio de segurança pré-existente, fora do escopo das alterações:** `src/services/authService.ts` usa um valor de fallback hardcoded para assinatura de sessão e reaproveita credenciais de outros serviços antes de chegar a esse fallback. Como a aplicação ainda não está em produção, não foi alterado aqui; antes de lançar, exigir um segredo de sessão dedicado e forte via variável de ambiente, retirar o fallback do código e revisar/rotacionar qualquer credencial que possa ter sido usada em ambiente compartilhado. O valor não é reproduzido neste relatório.
