import { getAIAuth } from './aiAuth';
export async function aiFetch(operation: string, input: unknown): Promise<Response> {
  const auth = getAIAuth();
  await auth.authStateReady();
  if (!auth.currentUser) throw new Error('Sign in to use AI.');
  const token = await auth.currentUser.getIdToken();
  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ operation, input }),
    signal: AbortSignal.timeout(65000),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'AI service unavailable. Please try again.');
  }
  return response;
}
export async function aiRequest<T>(operation: string, input: unknown): Promise<T> {
  return (await aiFetch(operation, input)).json();
}
