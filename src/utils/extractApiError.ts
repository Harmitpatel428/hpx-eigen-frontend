export interface ApiError {
  code?: string;
  message: string;
  status?: number;
}

export function extractApiError(err: unknown): ApiError {
  const e = err as {
    message?: string;
    response?: { status?: number; data?: { message?: string; code?: string } };
  } | null;
  return {
    code: e?.response?.data?.code,
    message: e?.response?.data?.message || e?.message || 'Something went wrong.',
    status: e?.response?.status,
  };
}
