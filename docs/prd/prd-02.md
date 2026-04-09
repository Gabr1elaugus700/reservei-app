# PRD — Refatoração da lógica de Edição de Capacidade por horário. 

## Contexto

As vezes é necessário editar a capacidade de um slot de tempo já existente (maior ou menor)

Hoje é feita na view `CapacityView.tsx`, mas será adicionada uma lógica na página `BookingsList` um botão "Editar Capacidade"
---

## Problema

Não funcionamento da `CapacityView.tsx`, excesso de alteração e risco de alteração em massa de um dia onde era pra editar somente um "Slot" de horário. 

---

## Objetivo

Garantir que, após a edição da capacidade de um horário, a tela `BookingsList` reflita corretamente o estado atualizado dos dados, sem duplicação visual de slots.

---

## Usuários

- Usuário autenticado que gerencia horários e agendamentos

---


## Fluxo atual

1. Usuário acessa a tela `BookingsList`
2. O frontend consulta os slots de horários configurados por dia
3. Usuário tem de acessar outra Página (`CapacityView`) edita a capacidade de um slot ou de um dia inteiro
4. O backend salva a alteração corretamente
5. O frontend atualiza a listagem
6. Pode acontecer de editar em massa a capacidade de um dia inteiro. 

---

## Fluxo esperado

1. Usuário acessa a tela `BookingsList`
2. O frontend consulta os horários e monta na tela. 
3. Usuário CLica no botão do slot: "Editar Capacidade desse horário"
4. Abre-se o campo de input numérico: "Nova Capacidade:" 
5. Usuário preeenche o novo valor
6. Clica em Salvar
7. O backend faz as verificações necessárias
8. Persiste no banco de dados
9. Atualiza a tela do usuário

---

## Requisitos Funcionais

- RF01: Validar se Nova Capacidade é maior do que o numero de agendamentos já existentes naquele horário.
- RF02: O frontend não deve exibir slots duplicados após a edição
- RF03: A atualização deve refletir exatamente os dados válidos do backend
- RF04: O usuário não deve precisar recarregar manualmente a página
- RF05: O sistema deve exibir feedback visual (ex: Toast ou Snackbar) indicando sucesso ou falha após a tentativa de salvar a nova capacidade

---

## Não Escopo

- Alteração da regra de negócio de capacidade
- Alteração da lógica de criação de slots
- Refatoração completa da tela de agendamentos, além do necessário para corrigir a inconsistência
- Alteração de tabelas no banco de dados
- Não mexer em outros componentes não relacionados

---

## Solução proposta

Implantar um botão em cada slot na BookingsList que abre um pequeno input numérico. Ao salvar, executar um PUT na API Route correspondente. Em caso de sucesso (200 OK), disparar a função de mutate (SWR) ou invalidateQueries (React Query) para a chave da listagem. Isso fará um re-fetch silencioso em background e atualizará apenas o valor modificado na tela de forma reativa.
---

## Critérios de Aceite

- Botões Funcionam corretamente com suas devidas ações propostas
- Não permite diminuir a capacidade para um valor menor que os agendamentos existentes (deve ser maior ou igual)
- não é necessário refresh manual da página para corrigir a visualização
- a correção funciona de forma consistente em novas edições na mesma sessão

---

