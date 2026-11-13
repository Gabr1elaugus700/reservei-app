-- Normaliza Customer.phone para DDD + número (10 ou 11 dígitos).
-- O 55 só sai quando é código do país (sobram 10 ou 11 dígitos).
-- DDD 55, com o número já no tamanho nacional, permanece.
-- Telefone inválido não é apagado: o script scripts/normalize-customer-phones.ts lista esses casos.
-- Não há @unique. Depois da normalização dois clientes ainda podem compartilhar o número,
-- e a constraint falharia até essa colisão ser resolvida manualmente.

UPDATE "Customer" AS customer
SET
    "phone" = normalized.national,
    "updatedAt" = CURRENT_TIMESTAMP
FROM (
    SELECT
        extracted.id,
        CASE
            WHEN length(extracted.digits) IN (12, 13)
             AND left(extracted.digits, 2) = '55'
            THEN substring(extracted.digits FROM 3)
            ELSE extracted.digits
        END AS national
    FROM (
        SELECT
            "id",
            regexp_replace("phone", '[^0-9]', '', 'g') AS digits
        FROM "Customer"
        WHERE "phone" IS NOT NULL
    ) AS extracted
) AS normalized
WHERE customer."id" = normalized.id
  AND length(normalized.national) IN (10, 11)
  AND customer."phone" IS DISTINCT FROM normalized.national;

-- Busca por telefone no agendamento público e no cadastro do cliente.
CREATE INDEX "Customer_phone_idx" ON "Customer"("phone");
