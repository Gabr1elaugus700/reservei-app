/**
 * Utilitários para serialização de datas sem considerar timezone
 * Sempre retorna datas no formato YYYY-MM-DD independente do timezone do servidor
 */

/**
 * Serializa um objeto Date para string YYYY-MM-DD
 * Extrai componentes diretamente sem conversão de timezone
 */
export function serializeDate(date: Date | null | undefined): string | null {
  if (!date) return null;
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Parse string YYYY-MM-DD para Date sem considerar timezone
 * Cria Date no timezone local (evita conversão UTC)
 */
export function parseDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Serializa objeto com campo date (e possíveis datas aninhadas)
 */
export function serializeConfigDate<T extends { date?: Date | null }>(obj: T): Omit<T, 'date'> & { date: string | null } {
  return {
    ...obj,
    date: serializeDate(obj.date),
  };
}

/**
 * Serializa array de objetos com campo date
 */
export function serializeConfigDates<T extends { date?: Date | null }>(objects: T[]): (Omit<T, 'date'> & { date: string | null })[] {
  return objects.map(serializeConfigDate);
}
