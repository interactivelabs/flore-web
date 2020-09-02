import { useSession } from './MsalAuth/client';

const baseUrl =
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:5000'
    : 'https://example.com/api/v1';

export const useAuthApi = async (
  path: string,
  options: Partial<RequestInit>,
): Promise<Response> => {
  const { getAccessToken } = useSession();
  const token = await getAccessToken();
  return fetch(`${baseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      ...options.headers,
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
};
