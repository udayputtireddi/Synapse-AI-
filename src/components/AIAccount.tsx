import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { getAIAuth, signInAI, signOutAI } from '../services/aiAuth';
export default function AIAccount() {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    try { return onAuthStateChanged(getAIAuth(), setUser); }
    catch (e) { setError((e as Error).message); }
  }, []);
  async function changeAccount() {
    setBusy(true); setError('');
    try { if (user) await signOutAI(); else await signInAI(); }
    catch { setError('Unable to sign in. Check popup permissions and try again.'); }
    finally { setBusy(false); }
  }
  return <aside aria-label="AI account" style={{ position: 'fixed', bottom: 80, right: 12, zIndex: 100, maxWidth: 300, padding: 10, borderRadius: 8, background: '#172033', color: '#fff', fontSize: 13 }}>
    <button type="button" onClick={changeAccount} disabled={busy} style={{ padding: 6 }}>
      {busy ? 'Please wait…' : user ? `Sign out (${user.email || 'AI account'})` : 'Sign in with Google for AI'}
    </button>
    {error && <p role="alert">{error}</p>}
  </aside>;
}
