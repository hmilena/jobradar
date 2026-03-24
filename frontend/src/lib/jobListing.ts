/**
 * Interpreta o parâmetro de página da URL para listagens de vagas.
 *
 * @param raw - Valor de `searchParams.page`
 * @param defaultPage - Página usada quando o valor é inválido ou ausente
 */
export function parseJobsPageParam(
  raw: string | undefined,
  defaultPage = 1,
): number {
  if (raw === undefined || raw === "") {
    return defaultPage;
  }
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) {
    return defaultPage;
  }
  return n;
}
