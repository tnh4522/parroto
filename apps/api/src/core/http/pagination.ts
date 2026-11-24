export interface PaginationResult {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function normalizePagination(
  page?: number | string,
  limit?: number | string,
  maxLimit = 50
): { page: number; limit: number; skip: number } {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(maxLimit, Math.max(1, Number(limit) || 12));
  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
  };
}

export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number
): PaginationResult {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
