### Erros identificados: 
=== 
## Na Tela Pública, de acesso aos agendamentos, Está com um erro ao clicar em uma data (passada) que não está mais disponivel. Erro: 
## Internal Server Error
src/hooks/use-timeslots.ts (39:15) @ loadTimeSlots


  37 |
  38 |       if (!response.ok || !result.success) {
> 39 |         throw new Error(result.message || "Error fetching time slots");
     |               ^
  40 |       }
  41 |
  42 |       setTimeSlots(result.data);

## Aumentar as Letras do calendário. Mostrar também somente as datas que permitem agendamento. Os demais dias, não.

## Colocar botão de whatsapp do Elton.

## Após o login, o dashBoard está com dados Mockados, colocar com dados reais.
