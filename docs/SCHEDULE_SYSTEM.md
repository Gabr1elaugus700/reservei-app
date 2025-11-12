### Documentação da Configuração da Schedule

| Entidade             | Papel                                                                    | Observações                                         |
| -------------------- | ------------------------------------------------------------------------ | --------------------------------------------------- |
| `AvailabilityConfig` | Define as **regras de disponibilidade padrão** (ex: seg–sex, 8h–18h)     | Pode ser por recurso, dia da semana, etc.           |
| `TimeSlot`           | Representa **slots reais de agendamento** (gerados a partir das configs) | Possui controle de capacidade e reservas feitas     |
| `Booking`            | Representa **reservas feitas por usuários**                              | Ligada a um `TimeSlot`, controla status e histórico |

