# PRD — Duplicação de slots de horários após edição de capacidade

## Contexto

Ao editar a capacidade de visitantes de um horário, o backend conclui a alteração com sucesso.

Porém, após a edição, a tela `BookingsList` passa a exibir o mesmo intervalo de horário duplicado no frontend. Como os dados da listagem são montados a partir do React Query com base na resposta do backend, existe indício de inconsistência na sincronização de estado após a mutation.

---

## Problema

Após editar a capacidade de um horário, a listagem apresenta slots duplicados no frontend.

Isso gera os seguintes impactos:

- o usuário não sabe qual horário exibido é o válido
- o usuário acredita que houve duplicação de agendamentos
- a interface transmite inconsistência e falta de confiabilidade
- o usuário pode realizar ações com base em uma visualização incorreta

---

## Objetivo

Garantir que, após a edição da capacidade de um horário, a tela `BookingsList` reflita corretamente o estado atualizado dos dados, sem duplicação visual de slots.

---

## Usuários

- Usuário autenticado que gerencia horários e agendamentos

---

## Hipótese principal

A duplicação ocorre no frontend, provavelmente durante a atualização do estado após a edição, em um dos seguintes pontos:

- merge incorreto de dados após mutation
- atualização duplicada de estado local combinada com React Query
- uso inadequado de `setQueryData`
- invalidação e re-render com reaproveitamento incorreto da lista anterior
- renderização com chave (`key`) não estável

---

## Fluxo atual

1. Usuário acessa a tela `BookingsList`
2. O frontend consulta os horários via React Query
3. Usuário edita a capacidade de um slot
4. O backend salva a alteração corretamente
5. O frontend atualiza a listagem
6. O mesmo horário passa a aparecer duas vezes na interface

---

## Fluxo esperado

1. Usuário acessa a tela `BookingsList`
2. O frontend consulta os horários via React Query
3. Usuário edita a capacidade de um slot
4. O backend salva a alteração corretamente
5. O frontend invalida ou atualiza a query correspondente
6. A listagem é reconstruída com base no estado mais recente
7. Cada horário deve aparecer apenas uma vez

---

## Requisitos Funcionais

- RF01: Após editar a capacidade de um horário, a listagem deve ser atualizada corretamente
- RF02: O frontend não deve exibir slots duplicados após a edição
- RF03: A atualização deve refletir exatamente os dados válidos do backend
- RF04: O usuário não deve precisar recarregar manualmente a página
- RF05: A correção deve funcionar tanto para atualização via refetch quanto via atualização controlada do cache da query

---

## Não Escopo

- Alteração da regra de negócio de capacidade
- Alteração da lógica de criação de slots
- Refatoração completa da tela de agendamentos, além do necessário para corrigir a inconsistência

---

## Solução proposta

Corrigir a sincronização de estado da listagem após a edição da capacidade, priorizando:

- invalidar a query da listagem após a mutation
- evitar merges manuais que adicionem novamente o slot já existente
- revisar qualquer estado local derivado da query
- garantir que a renderização use identificadores únicos e estáveis
- como fallback, executar refetch da listagem após sucesso da edição

---

## Critérios de Aceite

- ao editar a capacidade de um horário, o slot continua aparecendo apenas uma vez
- os dados exibidos após a edição correspondem ao retorno mais recente do backend
- não é necessário refresh manual da página para corrigir a visualização
- a correção funciona de forma consistente em novas edições na mesma sessão

---

## Métricas de sucesso

- zero casos de duplicação visual após edição
- redução de dúvidas do usuário sobre duplicidade de horários
- eliminação da necessidade de recarregar a página para corrigir a tela

---
****
## Riscos

- corrigir apenas a renderização e não a origem da duplicação
- existência de estado local derivado que continue sobrescrevendo a query
- o backend eventualmente retornar dados inconsistentes em cenários específicos