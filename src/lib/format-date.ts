/**
 * Formata uma data no formato brasileiro (dd/MM/yyyy)
 * @param dateString - String da data no formato ISO (yyyy-MM-dd)
 * @returns Data formatada no padrão brasileiro
 */
export function formatDate(dateString: string): string {
  try {
    // Parse YYYY-MM-DD sem conversão de timezone
    const [yearValue, monthValue, dayValue] = dateString.split('-').map(Number);
    const date = new Date(yearValue, monthValue - 1, dayValue);
    
    if (isNaN(date.getTime())) {
      return dateString;
    }

    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Erro ao formatar data:', error);
    return dateString;
  }
}

/**
 * Converte uma data do formato brasileiro (dd/MM/yyyy) para ISO (yyyy-MM-dd)
 * @param dateString - String da data no formato brasileiro
 * @returns Data no formato ISO
 */
export function parseBrazilianDate(dateString: string): string {
  try {
    const [day, month, year] = dateString.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  } catch (error) {
    console.error('Erro ao converter data brasileira:', error);
    return dateString;
  }
}

/**
 * Retorna o nome do dia da semana em português
 * @param date - Data a ser analisada
 * @returns Nome do dia da semana
 */
export function getDayName(date: Date): string {
  const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  return days[date.getDay()];
}

/**
 * Retorna o nome curto do dia da semana em português
 * @param date - Data a ser analisada
 * @returns Nome curto do dia da semana
 */
export function getShortDayName(date: Date): string {
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  return days[date.getDay()];
}
