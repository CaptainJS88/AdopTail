import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabase';
import { requestError } from '../lib/messages';
import Message from '../components/Message';
import { formatStatus } from '../lib/status';

type Visit = {
  id: string;
  animal_id: string;
  starts_at: string;
  rejection_reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  animal: { name: string } | null;
};

function visitDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    timeZone: 'America/Chicago', month: 'long', day: 'numeric', year: 'numeric',
  });
}

function visitTime(value: string) {
  const start = new Date(value);
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'America/Chicago', hour: 'numeric', minute: '2-digit',
  };
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  return `${start.toLocaleTimeString('en-US', options)} to ${end.toLocaleTimeString('en-US', options)}`;
}

const statusLabels = { pending: 'Awaiting confirmation', approved: 'Confirmed', rejected: 'Rejected' };

export default function Visits() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) return;
    const id = userId;
    let active = true;
    let fetching = false;
    setLoading(true);

    async function loadVisits() {
      if (fetching) return;
      fetching = true;
      try {
        const { data, error: queryError } = await supabase.from('appointments')
          .select('id, animal_id, starts_at, status, rejection_reason, animal:animals(name)')
          .eq('adopter_id', id).order('starts_at', { ascending: false }).returns<Visit[]>();
        if (queryError) throw queryError;
        if (active) { setVisits(data ?? []); setError(''); }
      } catch (cause) {
        if (active) setError(requestError(cause, 'We could not load your visits. Please try again.'));
      } finally {
        fetching = false;
        if (active) setLoading(false);
      }
    }

    const refresh = () => { if (document.visibilityState === 'visible') void loadVisits(); };
    void loadVisits();
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [userId]);

  if (!session) return (
    <section className="section container"><div className="page-content">
      <div className="page-heading"><h1>Your visits</h1><p>Sign in to see your visit requests and confirmed times.</p></div>
      <Link className="button" to="/account?next=/visits">Sign in</Link>
    </div></section>
  );

  const now = Date.now();
  const groups = [
    { title: 'Awaiting confirmation', rows: visits.filter(visit => visit.status === 'pending') },
    { title: 'Scheduled', rows: visits.filter(visit => visit.status === 'approved' && new Date(visit.starts_at).getTime() + 30 * 60 * 1000 > now).sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()) },
    { title: 'Past visits', rows: visits.filter(visit => visit.status === 'approved' && new Date(visit.starts_at).getTime() + 30 * 60 * 1000 <= now) },
    { title: 'Rejected', rows: visits.filter(visit => visit.status === 'rejected') },
  ];

  return (
    <section className="section container" aria-labelledby="visits-title">
      <div className="page-content grouped-page">
        <div className="visits-heading">
          <div className="page-heading"><h1 id="visits-title">Your visits</h1></div>
        </div>
        {loading && <Message kind="loading">Loading your visits...</Message>}
        {error && <Message kind="error">{error}</Message>}
        {!loading && !error && visits.length === 0 && <div className="empty-state history-empty"><h2>No visits yet</h2><p>Visit requests and confirmed times will appear here.</p><Link className="button button-secondary" to="/pets">Find a pet</Link></div>}
        <div className="status-groups">{!loading && !error && groups.filter(group => group.rows.length > 0).map(group => <section className="status-group" key={group.title}><h2 className="status-group-title">{formatStatus(group.title)}</h2>{group.rows.map(visit => (
          <article className="visit-record" key={visit.id}>
            <div className="application-heading"><h3>{visit.animal?.name || 'Pet visit'}</h3><span className={`status-badge status-${visit.status}`}>{formatStatus(statusLabels[visit.status])}</span></div>
            <dl className="record-details">
              <div><dt>Date:</dt><dd>{visitDate(visit.starts_at)}</dd></div>
              <div><dt>Time:</dt><dd>{visitTime(visit.starts_at)}</dd></div>
              {visit.status === 'rejected' && <div><dt>Reason for rejection:</dt><dd>{visit.rejection_reason || 'No reason was recorded. Please contact the shelter for details.'}</dd></div>}
            </dl>
            {visit.status !== 'rejected' && <p className="application-note">{visit.status === 'pending' ? 'This time is requested. Please wait for the shelter to confirm.' : new Date(visit.starts_at).getTime() + 30 * 60 * 1000 <= Date.now() ? 'This visit time has passed.' : 'Your visit is confirmed for the date and time shown above.'}</p>}
            <Link className="text-link" to={`/pets/${visit.animal_id}`}>View pet details</Link>
          </article>
        ))}</section>)}</div>
      </div>
    </section>
  );
}
