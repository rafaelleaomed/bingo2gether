# Bingo2Gether — contexto para agentes

## Produto e arquitetura
- Aplicação de metas financeiras gamificadas para casais, com React, TypeScript, Vite e PWA.
- Código principal em `src/`; estado em `src/store/`; regras e integrações em `src/services/`.
- Backend, autenticação e pagamentos usam funções e migrações em `supabase/`.
- `docs/` contém arquitetura, gamificação, monetização e roadmap; leia somente o documento relacionado à tarefa.

## Validação
- Execute `npm test` para testes automatizados.
- Execute `npm run build` antes de concluir mudanças de produção.

## Regras críticas
- Preserve regras de segurança, RLS, convites, pagamentos e isolamento entre casais.
- Não exponha chaves, dados financeiros ou informações pessoais.
- Mudanças em fórmulas de distribuição devem incluir teste de soma e proporcionalidade.
- Não publique nem faça deploy sem aprovação explícita.
