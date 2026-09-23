# Bingo2Gether - MAINTENANCE LOG (Trigger)

Este arquivo é o destino principal para rastrear bugs e incidentes técnicos. Toda sessão de depuração profunda deve começar lendo este arquivo para identificar padrões sistêmicos.

## Fluxo de Gatilho (Trigger Protocol)

Sempre que uma falha ocorrer, o usuário deve:

1. Criar um novo tópico com data e hora.
2. Definir o Sintoma Inicial e a Severidade (Baixa, Média, Alta, Crítica).
3. Invocar o assistente para diagnosticar e registrar a Solução Raiz (Root Cause).

---

## [Log Template]

**Data:** YYYY-MM-DD
**Sintoma:** Descrição curta do problema (ex: "Ai-Coach não responde após o pagamento").
**Severidade:** [Crítica/Alta/Média/Baixa]
**Root Cause (Causa Raiz):** [A ser preenchido após investigação]
**Solução (Hotfix/Patch):** [Passos técnicos adotados para a resolução permanente]

---

## Logs de Incidentes

*(Abaixo, um histórico contínuo de todos os desafios operacionais enfrentados)*

**Data:** 2026-02-25
**Sintoma:** Conflito de Deploy do Banco de Dados (PostgreSQL Error 42P07 - Table already exists).
**Severidade:** Alta
**Root Cause:** A tentativa inicial de conectar Lovable ao Supabase manual resultou na criação de diretórios vazios ou arquivos sem versionamento alinhado. Ao executar `supabase db push`, a migração tentava criar tabelas previamente populadas.
**Solução:** Comando `supabase migration repair --status applied [id]` foi utilizado para calibrar o histórico local de versão com o schema já existente na nuvem, permitindo que as tabelões avançassem sem colidir.
