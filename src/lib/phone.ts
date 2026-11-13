/**
 * Telefone nacional brasileiro: DDD + número, só dígitos.
 * 10 dígitos = fixo, 11 = celular.
 *
 * O 55 inicial só é código do país quando o que sobra tem 10 ou 11 dígitos.
 * Um número que já tem 10 ou 11 dígitos e começa com 55 é DDD 55 (RS), não o país.
 *
 * A migration `20261113140000_normalize_customer_phone` repete esta regra em SQL.
 * Se a regra mudar, os dois lugares precisam mudar juntos.
 */

const NATIONAL_LENGTHS = new Set([10, 11]);

export function normalizePhone(input: string | null | undefined): string | null {
  if (input == null) return null;

  const digits = input.replace(/\D/g, "");
  if (!digits) return null;

  const withoutCountryCode =
    digits.startsWith("55") && NATIONAL_LENGTHS.has(digits.length - 2)
      ? digits.slice(2)
      : digits;

  if (!NATIONAL_LENGTHS.has(withoutCountryCode.length)) {
    return null;
  }

  return withoutCountryCode;
}

/** Máscara para exibir um telefone já normalizado. */
export function formatPhone(input: string | null | undefined): string {
  const normalized = normalizePhone(input);
  if (!normalized) return "";

  const area = normalized.slice(0, 2);
  if (normalized.length === 11) {
    return `(${area}) ${normalized.slice(2, 7)}-${normalized.slice(7)}`;
  }

  return `(${area}) ${normalized.slice(2, 6)}-${normalized.slice(6)}`;
}
