import { useEffect, useState } from 'react';
import { sabivida, signIn, type Member, type MiniAppContext, type TaskOutcome } from './sabivida';

type State =
  | { kind: 'loading' }
  | { kind: 'outside' }
  | { kind: 'failed' }
  | { kind: 'ready'; member: Member; context: MiniAppContext };

// One sign-in per page: a launch token is accepted once, and StrictMode runs
// effects twice in development.
let signingIn: ReturnType<typeof signIn> | null = null;

const OUTCOME: Record<TaskOutcome, string> = {
  added: 'Added to the household plans.',
  declined: 'Not added: the member declined.',
  unavailable: 'SabiVida cannot add steps right now.',
};

export function App() {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [outcome, setOutcome] = useState<TaskOutcome | null>(null);
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    signingIn ??= signIn();
    signingIn
      .then(({ member, context }) => setState({ kind: 'ready', member, context }))
      .catch((error: Error) => setState({ kind: error.message === 'not_embedded' ? 'outside' : 'failed' }));
  }, []);

  async function addStep() {
    setAsking(true);
    // SabiVida shows the member this exact text before anything is added.
    setOutcome((await sabivida()?.addTask({ title: 'Book a consular appointment', dueDate: null })) ?? 'unavailable');
    setAsking(false);
  }

  if (state.kind === 'loading') return <main><p className="muted">Signing in with SabiVida…</p></main>;
  if (state.kind === 'outside')
    return (
      <main>
        <h1>Open this app from SabiVida</h1>
        <p className="muted">It signs members in through SabiVida, so it only works inside SabiVida.</p>
      </main>
    );
  if (state.kind === 'failed')
    return (
      <main>
        <h1>Sign-in failed</h1>
        <p className="muted">Your server refused the launch token. Check SABIVIDA_HOST and MINI_APP_ID.</p>
      </main>
    );

  const sdk = sabivida();
  return (
    <main>
      <h1>Hello, {state.member.name ?? 'SabiVida member'}</h1>
      <div className="card">
        <p>Your member id for this app: <code>{state.member.subject.slice(0, 12)}…</code></p>
        <p className="muted">
          Language {state.context.locale} · on {state.context.platform}
          {state.context.startParam ? ` · opened with “${state.context.startParam}”` : ''}
        </p>
      </div>
      <div className="actions">
        {sdk?.supports('add_task') ? (
          <button className="primary" disabled={asking} onClick={() => void addStep()}>
            Add a step to my plans
          </button>
        ) : null}
        <button onClick={() => sdk?.close()}>Close</button>
      </div>
      {outcome ? <p role="status">{OUTCOME[outcome]}</p> : null}
    </main>
  );
}
