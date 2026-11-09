import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';
import Message from '../components/Message';
import PetPhoto from '../components/PetPhoto';
import { requestError } from '../lib/messages';
import { formatStatus } from '../lib/status';
import { formatTime, getVisitDate, getVisitError, getVisitTimes } from '../data/shelter';

type AnimalPhoto = { id: string; animal_id: string; photo_url: string; alt_text: string; display_order: number; storage_path: string | null };
type AnimalRow = { id: string; name: string; species: string; breed: string | null; age_months: number | null; description: string; care_needs: string; adoption_status: string; listing_visible: boolean; created_at: string; photos: AnimalPhoto[] };
type ApplicationRow = { rejection_reason: string | null; id: string; animal_id: string; adopter_id: string; reason: string; status: string; submitted_at: string; decided_at: string | null; contact_name: string | null; contact_email: string | null; contact_phone: string | null; city: string | null; housing_type: string | null; household: string | null; other_pets: string | null; experience: string | null; daily_care: string | null; animal: { name: string } | null };
type AppointmentRow = { rejection_reason: string | null; id: string; animal_id: string; adopter_id: string; starts_at: string; status: string; created_at: string; contact_name: string | null; contact_email: string | null; contact_phone: string | null; visit_note: string | null; animal: { name: string } | null };
type MedicalRecordRow = { id: string; animal_id: string; record_type: string; record_date: string; summary: string; details: string; adopter_visible: boolean; animal: { name: string } | null };
type AdoptionRow = { id: string; application_id: string; animal_id: string; adopter_id: string; adopted_at: string; contact_name: string | null; contact_email: string | null; contact_phone: string | null; animal: { name: string } | null };
type RawAdoptionRow = Omit<AdoptionRow, 'contact_name' | 'contact_email' | 'contact_phone'> & { application: { contact_name: string | null; contact_email: string | null; contact_phone: string | null } | null };
type ProfileRow = { id: string; display_name: string; phone: string | null; city: string | null };
type Section = 'overview' | 'applications' | 'visits' | 'animals' | 'medical' | 'adoptions';

const sections: { id: Section; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'applications', label: 'Applications' },
  { id: 'visits', label: 'Visits' },
  { id: 'animals', label: 'Animals' },
  { id: 'medical', label: 'Medical records' },
  { id: 'adoptions', label: 'Completed adoptions' },
];

function dateTime(value: string) {
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Chicago' });
}
function dateOnly(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { dateStyle: 'medium' });
}
function display(value: string | null | undefined) {
  return value?.trim() || 'Not provided';
}

export default function StaffDashboard() {
  const { session } = useAuth();
  const [section, setSection] = useState<Section>('overview');
  const [animals, setAnimals] = useState<AnimalRow[]>([]);
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecordRow[]>([]);
  const [adoptions, setAdoptions] = useState<AdoptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyKey, setBusyKey] = useState('');
  const actionInProgress = useRef(false);

  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setLoadError('');
    const [animalsResult, applicationsResult, visitsResult, recordsResult, adoptionsResult] = await Promise.all([
      supabase.from('animals').select('id, name, species, breed, age_months, description, care_needs, adoption_status, listing_visible, created_at').order('created_at', { ascending: false }),
      supabase.from('adoption_applications').select('id, animal_id, adopter_id, reason, rejection_reason, status, submitted_at, decided_at, contact_name, contact_email, contact_phone, city, housing_type, household, other_pets, experience, daily_care, animal:animals(name)').order('submitted_at', { ascending: false }).returns<ApplicationRow[]>(),
      supabase.from('appointments').select('id, animal_id, adopter_id, starts_at, rejection_reason, status, created_at, contact_name, contact_email, contact_phone, visit_note, animal:animals(name)').order('created_at', { ascending: false }).returns<AppointmentRow[]>(),
      supabase.from('medical_records').select('id, animal_id, record_type, record_date, summary, details, adopter_visible, animal:animals(name)').order('record_date', { ascending: false }).returns<MedicalRecordRow[]>(),
      supabase.from('adoptions').select('id, application_id, animal_id, adopter_id, adopted_at, animal:animals(name), application:adoption_applications(contact_name, contact_email, contact_phone)').order('adopted_at', { ascending: false }).returns<RawAdoptionRow[]>(),
    ]);

    const failed = [animalsResult.error, applicationsResult.error, visitsResult.error, recordsResult.error, adoptionsResult.error].find(Boolean);
    if (failed) {
      setLoadError(requestError(failed, 'Staff information could not be loaded. Refresh and try again.'));
      setLoading(false);
      return;
    }

    const animalRows = (animalsResult.data ?? []) as Omit<AnimalRow, 'photos'>[];
    const photosResult = animalRows.length
      ? await supabase.from('animal_photos').select('id, animal_id, photo_url, alt_text, display_order, storage_path').in('animal_id', animalRows.map((animal) => animal.id)).order('display_order').returns<AnimalPhoto[]>()
      : { data: [] as AnimalPhoto[], error: null };
    if (photosResult.error) {
      setLoadError(requestError(photosResult.error, 'Pet photos could not be loaded. Refresh and try again.'));
      setLoading(false);
      return;
    }
    const photosByAnimal = new Map<string, AnimalPhoto[]>();
    for (const photo of photosResult.data ?? []) {
      photosByAnimal.set(photo.animal_id, [...(photosByAnimal.get(photo.animal_id) ?? []), photo]);
    }
    setAnimals(animalRows.map((animal) => ({ ...animal, photos: photosByAnimal.get(animal.id) ?? [] })));
    const applicationRows = applicationsResult.data ?? [];
    const visitRows = visitsResult.data ?? [];
    const adoptionRows = adoptionsResult.data ?? [];
    const adopterIds = [...new Set([...applicationRows, ...visitRows, ...adoptionRows].map(row => row.adopter_id))];
    const profilesResult = adopterIds.length
      ? await supabase.from('profiles').select('id, display_name, phone, city').in('id', adopterIds).returns<ProfileRow[]>()
      : { data: [] as ProfileRow[], error: null };
    if (profilesResult.error) {
      setLoadError(requestError(profilesResult.error, 'Adopter details could not be loaded. Please try again.'));
      setLoading(false);
      return;
    }
    const contacts = [...applicationRows, ...visitRows];
    function contactFor(adopterId: string) {
      const profile = profilesResult.data?.find(row => row.id === adopterId);
      const savedName = contacts.find(row => row.adopter_id === adopterId && row.contact_name)?.contact_name;
      const savedEmail = contacts.find(row => row.adopter_id === adopterId && row.contact_email)?.contact_email;
      const savedPhone = contacts.find(row => row.adopter_id === adopterId && row.contact_phone)?.contact_phone;
      return { contact_name: profile?.display_name || savedName || null, contact_email: savedEmail || null, contact_phone: profile?.phone || savedPhone || null, city: profile?.city || null };
    }
    setApplications(applicationRows.map(row => {
      const contact = contactFor(row.adopter_id);
      return { ...row, contact_name: row.contact_name || contact.contact_name, contact_email: row.contact_email || contact.contact_email, contact_phone: row.contact_phone || contact.contact_phone, city: row.city || contact.city };
    }));
    setAppointments(visitRows.map(row => {
      const contact = contactFor(row.adopter_id);
      return { ...row, contact_name: row.contact_name || contact.contact_name, contact_email: row.contact_email || contact.contact_email, contact_phone: row.contact_phone || contact.contact_phone };
    }));
    setMedicalRecords((recordsResult.data ?? []) as MedicalRecordRow[]);
    setAdoptions(adoptionRows.map(row => {
      const contact = contactFor(row.adopter_id);
      return { ...row, contact_name: row.application?.contact_name || contact.contact_name, contact_email: row.application?.contact_email || contact.contact_email, contact_phone: row.application?.contact_phone || contact.contact_phone };
    }));
    setLoading(false);
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  async function runAction(key: string, action: () => Promise<void>, success: string): Promise<boolean> {
    if (actionInProgress.current) return false;
    actionInProgress.current = true;
    setBusyKey(key);
    setActionError('');
    setNotice('');
    try {
      await action();
      setNotice(success);
      await loadData(false);
      return true;
    } catch (cause) {
      setActionError(requestError(cause, 'That change could not be saved. Please try again.'));
      return false;
    } finally {
      actionInProgress.current = false;
      setBusyKey('');
    }
  }

  if (loading) return <section className="section container"><Message kind="loading">Loading staff dashboard...</Message></section>;

  return (
    <section className="section container staff-area" aria-labelledby="staff-title">
      <div className="staff-heading">
        <div className="page-heading">
          <h1 id="staff-title">Staff dashboard</h1>
        </div>
      </div>
      <nav className="staff-tabs" aria-label="Staff dashboard sections">
        {sections.map((item) => <button key={item.id} type="button" className={section === item.id ? 'staff-tab active' : 'staff-tab'} aria-current={section === item.id ? 'page' : undefined} onClick={() => { setSection(item.id); setActionError(''); setNotice(''); }}>{item.label}</button>)}
      </nav>
      {loadError && <Message kind="error">{loadError}</Message>}
      {actionError && <Message kind="error">{actionError}</Message>}
      {notice && <Message kind="success">{notice}</Message>}
      {loadError ? <button className="button button-secondary" type="button" onClick={() => void loadData()}>Retry</button> : (
        <>
          {section === 'overview' && <Overview animals={animals} applications={applications} appointments={appointments} medicalRecords={medicalRecords} adoptions={adoptions} onNavigate={setSection} />}
          {section === 'applications' && <ApplicationsPanel rows={applications} adoptions={adoptions} busyKey={busyKey} decide={(row, decision, reason) => runAction(`application-${row.id}`, async () => { const { error } = await supabase.rpc('decide_adoption_application', { p_application_id: row.id, p_decision: decision, p_rejection_reason: reason || null }); if (error) throw error; }, `Application ${decision}.`)} complete={(row) => runAction(`complete-${row.id}`, async () => { const { error } = await supabase.rpc('complete_adoption', { p_application_id: row.id }); if (error) throw error; }, 'Adoption recorded and pet marked adopted.')} />}
          {section === 'visits' && <VisitsPanel rows={appointments} busyKey={busyKey} decide={(row, decision, reason) => runAction(`visit-${row.id}`, async () => { const { error } = await supabase.rpc('decide_appointment', { p_appointment_id: row.id, p_decision: decision, p_rejection_reason: reason || null }); if (error) throw error; }, `Visit ${decision}.`)} reschedule={(row, value) => runAction(`reschedule-${row.id}`, async () => { const { error } = await supabase.rpc('reschedule_appointment', { p_appointment_id: row.id, p_new_starts_at: value }); if (error) throw error; }, 'Visit time updated. The confirmed time is now shown in the adopter’s My visits page.')} />}
          {section === 'animals' && <AnimalsPanel rows={animals} busyKey={busyKey} onRefresh={() => loadData(false)} save={(id, values) => runAction(`animal-${id ?? 'new'}`, async () => { const result = id ? await supabase.from('animals').update(values).eq('id', id) : await supabase.from('animals').insert(values).select('id').single(); if (result.error) throw result.error; }, id ? 'Pet listing updated.' : 'Pet listing added.')} setHidden={(animal) => runAction(`hidden-${animal.id}`, async () => { const { error } = await supabase.from('animals').update({ listing_visible: !animal.listing_visible }).eq('id', animal.id); if (error) throw error; }, animal.listing_visible ? 'Pet listing hidden.' : 'Pet listing visible to adopters.')} setFoster={(animal) => runAction(`foster-${animal.id}`, async () => { const { error } = await supabase.rpc('set_animal_foster_status', { p_animal_id: animal.id, p_is_fostered: animal.adoption_status !== 'fostered' }); if (error) throw error; }, animal.adoption_status === 'fostered' ? 'Pet returned to available status.' : 'Pet marked as fostered.')} />}
          {section === 'medical' && <MedicalPanel rows={medicalRecords} animals={animals} busyKey={busyKey} save={(record, id) => runAction(`medical-${id ?? 'new'}`, async () => { const result = id ? await supabase.from('medical_records').update(record).eq('id', id) : await supabase.from('medical_records').insert({ ...record, recorded_by: session?.user.id ?? null }); if (result.error) throw result.error; }, id ? 'Medical record updated.' : 'Medical record added.')} />}
          {section === 'adoptions' && <AdoptionsPanel rows={adoptions} />}
        </>
      )}
    </section>
  );
}

function Overview({ animals, applications, appointments, medicalRecords, adoptions, onNavigate }: {
  animals: AnimalRow[]; applications: ApplicationRow[]; appointments: AppointmentRow[]; medicalRecords: MedicalRecordRow[]; adoptions: AdoptionRow[]; onNavigate: (section: Section) => void;
}) {
  const pendingApplications = applications.filter((row) => row.status === 'submitted').length;
  const pendingVisits = appointments.filter((row) => row.status === 'pending').length;
  return (
    <div className="staff-panel">
      <div className="staff-stat-grid">
        <h2>Needs attention</h2>
        <button type="button" className={`staff-stat ${pendingApplications ? 'staff-stat-alert' : ''}`} onClick={() => onNavigate('applications')}><span>Applications to review</span><strong>{pendingApplications}</strong></button>
        <button type="button" className={`staff-stat ${pendingVisits ? 'staff-stat-alert' : ''}`} onClick={() => onNavigate('visits')}><span>Visits to confirm</span><strong>{pendingVisits}</strong></button>
        <h2>Shelter records</h2>
        <button type="button" className="staff-stat" onClick={() => onNavigate('animals')}><span>Pets</span><strong>{animals.length}</strong></button>
        <button type="button" className="staff-stat" onClick={() => onNavigate('medical')}><span>Medical records</span><strong>{medicalRecords.length}</strong></button>
        <button type="button" className="staff-stat" onClick={() => onNavigate('adoptions')}><span>Completed adoptions</span><strong>{adoptions.length}</strong></button>
      </div>
    </div>
  );
}

function ApplicationsPanel({ rows, adoptions, busyKey, decide, complete }: {
  rows: ApplicationRow[]; adoptions: AdoptionRow[]; busyKey: string; decide: (row: ApplicationRow, decision: 'approved' | 'rejected', reason?: string) => Promise<boolean>; complete: (row: ApplicationRow) => Promise<boolean>;
}) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const completed = new Map(adoptions.map(adoption => [adoption.application_id, adoption.adopted_at]));
  const priority = (row: ApplicationRow) => row.status === 'submitted' ? 0 : row.status === 'approved' && !completed.has(row.id) ? 1 : 2;
  const sortedRows = [...rows].sort((a, b) => priority(a) - priority(b) || new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());
  const groups = [
    { title: 'To review', rows: sortedRows.filter(row => row.status === 'submitted' && !completed.has(row.id)) },
    { title: 'Approved', rows: sortedRows.filter(row => row.status === 'approved' && !completed.has(row.id)) },
    { title: 'Adopted', rows: sortedRows.filter(row => completed.has(row.id)).sort((a, b) => new Date(completed.get(b.id) || b.submitted_at).getTime() - new Date(completed.get(a.id) || a.submitted_at).getTime()) },
    { title: 'Rejected', rows: sortedRows.filter(row => row.status === 'rejected' && !completed.has(row.id)) },
  ];
  if (!rows.length) return <EmptyPanel title="No applications yet" body="New adoption applications will appear here." />;
  return <div className="staff-panel"><h2 className="visually-hidden">Adoption applications</h2><div className="status-groups">{groups.filter(group => group.rows.length > 0).map(group => <section className="status-group" key={group.title}><h3 className="status-group-title">{formatStatus(group.title)}</h3><div className="staff-record-list">{group.rows.map((row) => (
    <article className="staff-record" key={row.id}>
      <div className="staff-record-heading"><div><div className="staff-title-line"><h4>{row.animal?.name ?? 'Pet listing'}</h4><StatusBadge status={completed.has(row.id) ? 'completed' : row.status} label={completed.has(row.id) ? 'Adopted' : undefined} /></div><p>{completed.has(row.id) ? 'Adopted:' : 'Submitted:'} {dateTime(completed.get(row.id) || row.submitted_at)}</p></div></div>

      <section className="staff-detail-section">
        <h5>{completed.has(row.id) ? 'Adopter details' : 'Contact details'}</h5>
        <dl className="staff-details">
          {[
            { label: 'Name', value: row.contact_name },
            { label: 'Email', value: row.contact_email },
            { label: 'Phone', value: row.contact_phone },
            { label: 'City', value: row.city },
          ].filter(field => field.value?.trim()).map(field => <div key={field.label}><dt>{field.label}:</dt><dd>{field.value}</dd></div>)}
        </dl>
        {!row.contact_name && !row.contact_email && !row.contact_phone && <p className="application-note">Applicant contact details were not recorded.</p>}
      </section>
      {!completed.has(row.id) && <section className="staff-detail-section">
        <h5>Adoption details</h5>
        <dl className="record-details">
          {[
            { label: 'Home type', value: row.housing_type },
            { label: 'Household', value: row.household },
            { label: 'Other pets', value: row.other_pets },
            { label: 'Pet experience', value: row.experience },
            { label: 'Daily care plan', value: row.daily_care },
            { label: 'Why they want to adopt', value: row.reason },
            { label: 'Reason for rejection', value: row.status === 'rejected' ? row.rejection_reason : null },
          ].filter(field => field.value?.trim()).map(field => <div key={field.label}><dt>{field.label}:</dt><dd>{field.value}</dd></div>)}
        </dl>
      </section>}
      {row.status === 'submitted' && <div className="staff-actions">
        <RejectRequest busy={Boolean(busyKey)} label="Reject application" save={reason => decide(row, 'rejected', reason)}>
          <button type="button" className="button" disabled={Boolean(busyKey)} onClick={() => { if (window.confirm(`Approve the application for ${row.animal?.name ?? 'this pet'}?`)) decide(row, 'approved'); }}>{busyKey === `application-${row.id}` ? 'Saving…' : 'Approve application'}</button>
        </RejectRequest>
      </div>}
      {!completed.has(row.id) && row.status === 'approved' && (
        confirmId === row.id ? <div className="staff-confirmation">
          <h4>Complete this adoption?</h4>
          <p>Confirm only after {row.animal?.name ?? 'this pet'} has gone home with the adopter. This records the adoption and marks the pet as adopted.</p>
          <div className="staff-actions">
            <button type="button" className="button" disabled={Boolean(busyKey)} onClick={async () => { if (await complete(row)) setConfirmId(null); }}>{busyKey === `complete-${row.id}` ? 'Saving...' : 'Confirm completed adoption'}</button>
            <button type="button" className="button button-secondary" disabled={Boolean(busyKey)} onClick={() => setConfirmId(null)}>Cancel</button>
          </div>
        </div> : <div className="staff-actions"><button type="button" className="button button-secondary" disabled={Boolean(busyKey)} onClick={() => setConfirmId(row.id)}>Record completed adoption</button></div>
      )}
    </article>
  ))}</div></section>)}</div></div>;
}

function VisitsPanel({ rows, busyKey, decide, reschedule }: {
  rows: AppointmentRow[];
  busyKey: string;
  decide: (row: AppointmentRow, decision: 'approved' | 'rejected', reason?: string) => Promise<boolean>;
  reschedule: (row: AppointmentRow, value: string) => Promise<boolean>;
}) {
  const now = Date.now();
  const priority = (row: AppointmentRow) => row.status === 'pending' ? 0 : row.status === 'approved' && new Date(row.starts_at).getTime() > now ? 1 : 2;
  const sortedRows = [...rows].sort((a, b) => priority(a) - priority(b) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const groups = [
    { title: 'To confirm', rows: sortedRows.filter(row => row.status === 'pending') },
    { title: 'Scheduled', rows: sortedRows.filter(row => row.status === 'approved' && new Date(row.starts_at).getTime() + 30 * 60 * 1000 > now) },
    { title: 'Past visits', rows: sortedRows.filter(row => row.status === 'approved' && new Date(row.starts_at).getTime() + 30 * 60 * 1000 <= now) },
    { title: 'Rejected', rows: sortedRows.filter(row => row.status === 'rejected') },
  ];
  if (!rows.length) return <EmptyPanel title="No visit requests yet" body="New visit requests will appear here." />;
  return <div className="staff-panel">
    <h2 className="visually-hidden">Visit requests</h2>
    <div className="status-groups">{groups.filter(group => group.rows.length > 0).map(group => <section className="status-group" key={group.title}><h3 className="status-group-title">{formatStatus(group.title)}</h3><div className="staff-record-list">{group.rows.map(row => (
      <article className="staff-record" key={row.id}>
        <div className="staff-record-heading"><div><div className="staff-title-line"><h4>{row.animal?.name ?? 'Pet listing'}</h4><StatusBadge status={row.status} label={row.status === 'approved' ? 'Confirmed' : row.status === 'pending' ? 'Awaiting confirmation' : 'Rejected'} /></div><p>Date and time: {dateTime(row.starts_at)}</p></div></div>

          <dl className="record-details">
            {row.contact_name && <div><dt>Name:</dt><dd>{row.contact_name}</dd></div>}
            {row.contact_email && <div><dt>Email:</dt><dd>{row.contact_email}</dd></div>}
            {row.contact_phone && <div><dt>Phone:</dt><dd>{row.contact_phone}</dd></div>}
            {row.visit_note && <div><dt>Question:</dt><dd>{row.visit_note}</dd></div>}
            {row.status === 'rejected' && row.rejection_reason?.trim() && <div><dt>Reason for rejection:</dt><dd>{row.rejection_reason}</dd></div>}
          </dl>
        {!row.contact_name && !row.contact_email && !row.contact_phone && <p className="application-note">Visitor contact details were not recorded.</p>}
        {row.status === 'pending' && <div className="staff-actions">
          <RejectRequest busy={Boolean(busyKey)} save={reason => decide(row, 'rejected', reason)}>
          <button type="button" className="button" disabled={Boolean(busyKey) || new Date(row.starts_at) <= new Date()} onClick={() => { if (window.confirm(`Confirm ${row.animal?.name ?? 'this pet'} for ${dateTime(row.starts_at)} Central Time?`)) decide(row, 'approved'); }}>Confirm time</button>

          </RejectRequest>
        </div>}
          {row.status === 'pending' && new Date(row.starts_at) <= new Date() && <p className="application-note">This time has passed. Reject the request so the adopter can choose again.</p>}
        {row.status === 'approved' && (new Date(row.starts_at) <= new Date() ? <p className="application-note">Past visit</p> : <RescheduleVisit key={row.starts_at} row={row} busy={Boolean(busyKey)} save={value => reschedule(row, value)} />)}
      </article>
    ))}</div></section>)}</div>
  </div>;
}

function RejectRequest({ busy, save, children, label = 'Reject request' }: { busy: boolean; save: (reason: string) => Promise<boolean>; children?: ReactNode; label?: string }) {
  const errorId = useId();
  const [editing, setEditing] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reason.trim()) { setError('Enter a reason for the adopter.'); return; }
    setError('');
    if (await save(reason.trim())) { setEditing(false); setReason(''); }
  }

  if (!editing) return <>{children}<button type="button" className="text-button" disabled={busy} onClick={() => setEditing(true)}>{label}</button></>;
  return <form className="rejection-form" onSubmit={submit}>
    <div className="field"><label htmlFor={`${errorId}-reason`}>Reason for rejection <span className="required-mark" aria-hidden="true">*</span></label>
      <textarea id={`${errorId}-reason`} value={reason} onChange={event => { setReason(event.target.value); setError(''); }} maxLength={1000} rows={3} disabled={busy} aria-invalid={Boolean(error)} aria-required="true" aria-describedby={error ? `${errorId} ${errorId}-hint` : `${errorId}-hint`} />
      <p className="input-hint" id={`${errorId}-hint`}>This reason will be shown to the adopter.</p>
    </div>
    {error && <p id={errorId} className="input-error" role="alert">{error}</p>}
    <div className="staff-actions">
      <button type="submit" className="button" disabled={busy}>{busy ? 'Saving...' : 'Send rejection'}</button>
      <button type="button" className="button button-secondary" disabled={busy} onClick={() => { setEditing(false); setReason(''); setError(''); }}>Cancel</button>
    </div>
  </form>;
}

function RescheduleVisit({ row, busy, save }: { row: AppointmentRow; busy: boolean; save: (value: string) => Promise<boolean> }) {
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState('');
  const todayParts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const today = ['year', 'month', 'day'].map(type => todayParts.find(part => part.type === type)?.value).join('-');
  const dateError = date ? getVisitError(date, time || getVisitTimes(date)[0] || '') : '';
  const currentError = error || (date && !getVisitTimes(date).length ? dateError : '');

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!date) return setError('Choose a new visit date.');
    if (!getVisitTimes(date).length) return setError(getVisitError(date, time));
    if (!time) return setError('Choose a new visit time.');
    const validationError = getVisitError(date, time);
    if (validationError) return setError(validationError);
    if (getVisitDate(date, time).getTime() === new Date(row.starts_at).getTime()) return setError('Choose a different time from the current visit.');
    setError('');
    setReviewing(true);
  }

  if (!editing) return <div className="staff-actions"><button type="button" className="text-button" disabled={busy} onClick={() => setEditing(true)}>Change visit time</button></div>;
  return <div className="staff-reschedule">
    <h4>Change confirmed visit</h4>
    <p className="application-note">Current: {dateTime(row.starts_at)}</p>
    {currentError && <Message kind="error">{currentError}</Message>}
    {reviewing ? <>
      <p className="application-note">New: {dateTime(getVisitDate(date, time).toISOString())}. The visit stays confirmed.</p>
      <div className="staff-actions">
        <button type="button" className="button" disabled={busy} onClick={async () => {
          const validationError = getVisitError(date, time);
          if (validationError) { setError(validationError); setReviewing(false); return; }
          if (await save(getVisitDate(date, time).toISOString())) setEditing(false);
        }}>{busy ? 'Saving...' : 'Confirm new time'}</button>
        <button type="button" className="button button-secondary" disabled={busy} onClick={() => setReviewing(false)}>Edit time</button>
        <button type="button" className="text-button" disabled={busy} onClick={() => { setEditing(false); setReviewing(false); setError(''); }}>Cancel</button>
      </div>
    </> : <form onSubmit={review} noValidate>
      <div className="form-grid">
        <div className="field"><label htmlFor={`visit-date-${row.id}`}>New date</label><input id={`visit-date-${row.id}`} type="date" min={today} required value={date} onChange={event => { setDate(event.target.value); setTime(''); setError(''); }} /></div>
        <div className="field"><label htmlFor={`visit-time-${row.id}`}>New time</label><select id={`visit-time-${row.id}`} required value={time} disabled={!date || !getVisitTimes(date).length} onChange={event => { setTime(event.target.value); setError(''); }}>
          <option value="">Choose a time</option>
          {getVisitTimes(date).map(value => <option key={value} value={value} disabled={getVisitDate(date, value) <= new Date()}>{formatTime(value)}</option>)}
        </select></div>
      </div>
      <p className="input-hint">Monday to Friday, 10 AM to 6 PM. Saturday, 10 AM to 4 PM. Closed Sundays.</p>
      <div className="staff-actions"><button type="submit" className="button button-secondary" disabled={busy}>Review new time</button><button type="button" className="button button-secondary" disabled={busy} onClick={() => { setEditing(false); setError(''); }}>Cancel</button></div>
    </form>}
  </div>;
}

function AnimalsPanel({ rows, busyKey, onRefresh, save, setHidden, setFoster }: {
  rows: AnimalRow[]; busyKey: string; onRefresh: () => Promise<void>; save: (id: string | null, values: Record<string, unknown>) => Promise<boolean>; setHidden: (row: AnimalRow) => void; setFoster: (row: AnimalRow) => void;
}) {
  const [editing, setEditing] = useState<AnimalRow | null>(null);
  const [adding, setAdding] = useState(false);
  const [formError, setFormError] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [photoBusy, setPhotoBusy] = useState('');
  async function saveAnimal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');
    const form = new FormData(event.currentTarget);
    const age = String(form.get('age_months') || '').trim();
    const values = {
      name: String(form.get('name') || '').trim(),
      species: String(form.get('species') || '').trim(),
      breed: String(form.get('breed') || '').trim() || null,
      age_months: age ? Number(age) : null,
      description: String(form.get('description') || '').trim(),
      care_needs: String(form.get('care_needs') || '').trim(),
      listing_visible: form.get('listing_visible') === 'on',
    };
    try {
      const saved = await save(editing?.id ?? null, values);
      if (saved) { setEditing(null); setAdding(false); }
    } catch (cause) {
      setFormError(requestError(cause, 'Pet listing could not be saved. Check the form and try again.'));
    }
  }
  async function uploadPhotos(animal: AnimalRow, files: FileList | null) {
    if (!files?.length) return;
    setPhotoError('');
    setPhotoBusy(animal.id);
    try {
      for (const file of Array.from(files)) {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Choose a JPG, PNG, or WebP image.');
        if (file.size > 5 * 1024 * 1024) throw new Error('Each image must be 5 MB or smaller.');
        const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
        const path = `${animal.id}/${crypto.randomUUID()}-${safeName}`;
        const { error: uploadError } = await supabase.storage.from('animal-photos').upload(path, file, { contentType: file.type, upsert: false });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('animal-photos').getPublicUrl(path);
        const { error: insertError } = await supabase.from('animal_photos').insert({ animal_id: animal.id, photo_url: data.publicUrl, storage_path: path, alt_text: `${animal.name}, shelter pet`, display_order: animal.photos.length + Array.from(files).indexOf(file) });
        if (insertError) {
          await supabase.storage.from('animal-photos').remove([path]);
          throw insertError;
        }
      }
      await onRefresh();
    } catch (cause) {
      setPhotoError(requestError(cause, 'Pet photo could not be uploaded.'));
      await onRefresh();
    } finally {
      setPhotoBusy('');
    }
  }
  async function replacePhoto(animal: AnimalRow, photo: AnimalPhoto, file: File) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setPhotoError('Choose a JPG, PNG, or WebP image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('Each image must be 5 MB or smaller.');
      return;
    }
    setPhotoBusy(photo.id);
    setPhotoError('');
    const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
    const path = `${animal.id}/${crypto.randomUUID()}-${safeName}`;
    try {
      const { error: uploadError } = await supabase.storage.from('animal-photos').upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('animal-photos').getPublicUrl(path);
      const { error: updateError } = await supabase.from('animal_photos').update({ photo_url: data.publicUrl, storage_path: path }).eq('id', photo.id);
      if (updateError) {
        await supabase.storage.from('animal-photos').remove([path]);
        throw updateError;
      }
      if (photo.storage_path) {
        const { error: cleanupError } = await supabase.storage.from('animal-photos').remove([photo.storage_path]);
        if (cleanupError) setPhotoError('The photo was replaced, but the previous image file could not be cleaned up.');
      }
      await onRefresh();
    } catch (cause) {
      setPhotoError(requestError(cause, 'Pet photo could not be replaced.'));
    } finally {
      setPhotoBusy('');
    }
  }
  async function removePhoto(photo: AnimalPhoto) {
    setPhotoBusy(photo.id);
    setPhotoError('');
    try {
      const { error: deleteError } = await supabase.from('animal_photos').delete().eq('id', photo.id);
      if (deleteError) throw deleteError;
      if (photo.storage_path) {
        const { error: cleanupError } = await supabase.storage.from('animal-photos').remove([photo.storage_path]);
        if (cleanupError) setPhotoError('The photo was removed from the listing, but its image file could not be cleaned up.');
      }
      await onRefresh();
    } catch (cause) {
      setPhotoError(requestError(cause, 'Pet photo could not be removed.'));
    } finally {
      setPhotoBusy('');
    }
  }

  return <div className="staff-panel">
    <div className="staff-panel-heading"><h2 className="visually-hidden">Animal listings</h2><button className="button button-small button-secondary" type="button" onClick={() => { setAdding(true); setEditing(null); }}>Add a pet</button></div>
    {formError && <Message kind="error">{formError}</Message>}{photoError && <Message kind="error">{photoError}</Message>}
    {(adding || editing) && <form className="staff-form" onSubmit={saveAnimal}>
      <h3>{editing ? `Edit ${editing.name}` : 'Add an animal'}</h3>
      <div className="form-grid">
        <div className="field"><label htmlFor="animal-name">Name</label><input id="animal-name" name="name" required maxLength={100} defaultValue={editing?.name ?? ''} /></div>
        <div className="field"><label htmlFor="animal-species">Species</label><input id="animal-species" name="species" required maxLength={50} defaultValue={editing?.species ?? ''} /></div>
        <div className="field"><label htmlFor="animal-breed">Breed</label><input id="animal-breed" name="breed" maxLength={100} defaultValue={editing?.breed ?? ''} /></div>
        <div className="field"><label htmlFor="animal-age">Age in months</label><input id="animal-age" name="age_months" type="number" min="0" step="1" defaultValue={editing?.age_months ?? ''} /></div>
      </div>
      <div className="field"><label htmlFor="animal-description">Description</label><textarea id="animal-description" name="description" required maxLength={2000} rows={3} defaultValue={editing?.description ?? ''} /></div>
      <div className="field"><label htmlFor="animal-care">Care needs</label><textarea id="animal-care" name="care_needs" maxLength={2000} rows={3} defaultValue={editing?.care_needs ?? ''} /></div>
      <label className="staff-checkbox"><input type="checkbox" name="listing_visible" defaultChecked={editing?.listing_visible ?? true} /> Show this listing to adopters</label>
      <div className="staff-actions"><button className="button" type="submit" disabled={busyKey.startsWith('animal-')}>{busyKey.startsWith('animal-') ? 'Saving…' : 'Save listing'}</button><button className="button button-secondary" type="button" onClick={() => { setAdding(false); setEditing(null); }}>Cancel</button></div>
    </form>}
    {!rows.length && !adding && <EmptyPanel title="No animal listings" body="Add a pet to begin the shelter roster." />}
    <div className="staff-record-list">{rows.map((animal) => <article className="staff-record" key={animal.id}>
      <div className="staff-record-heading">
        <div className="staff-title-line"><h3>{animal.name}</h3><StatusBadge status={animal.adoption_status} /></div>
      </div>
      <dl className="staff-details">
        <div><dt>Species:</dt><dd>{animal.species}</dd></div>
        <div><dt>Breed:</dt><dd>{display(animal.breed)}</dd></div>
        <div><dt>Age:</dt><dd>{animal.age_months === null ? 'Not recorded' : `${animal.age_months} months`}</dd></div>
        <div><dt>Description:</dt><dd>{animal.description}</dd></div>
        <div><dt>Care needs:</dt><dd>{display(animal.care_needs)}</dd></div>
      </dl>
      <div className="staff-actions"><button type="button" className="button button-secondary" onClick={() => { setEditing(animal); setAdding(false); }}>Edit listing</button><button type="button" className="button button-secondary" disabled={busyKey === `hidden-${animal.id}`} onClick={() => setHidden(animal)}>{animal.listing_visible ? 'Hide from adopters' : 'Show to adopters'}</button>{['available', 'fostered'].includes(animal.adoption_status) && <button type="button" className="button button-secondary" disabled={busyKey === `foster-${animal.id}`} onClick={() => setFoster(animal)}>{animal.adoption_status === 'fostered' ? 'Return to available' : 'Mark fostered'}</button>}</div>
      <div className="staff-photos"><h4>Photos</h4>{animal.photos.length > 0 && <div className="staff-photo-grid">{animal.photos.map((photo) => <figure key={photo.id}><PetPhoto src={photo.photo_url} petId={animal.id} alt={photo.alt_text || `${animal.name}, shelter pet`} /><figcaption><span className="staff-photo-actions"><label className="button button-small button-secondary" htmlFor={`photo-replace-${photo.id}`}>Replace</label><input className="visually-hidden" id={`photo-replace-${photo.id}`} type="file" accept="image/jpeg,image/png,image/webp" disabled={photoBusy === photo.id} onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) void replacePhoto(animal, photo, file); event.currentTarget.value = ''; }} /><button type="button" className="text-button" disabled={photoBusy === photo.id} onClick={() => { if (window.confirm('Remove this pet photo?')) void removePhoto(photo); }}>Remove</button></span></figcaption></figure>)}</div>}<div className="staff-upload"><div className="field"><label htmlFor={`photo-upload-${animal.id}`}>Upload pet photos</label><input id={`photo-upload-${animal.id}`} type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={photoBusy === animal.id} onChange={(event) => { void uploadPhotos(animal, event.target.files); event.currentTarget.value = ''; }} /><p className="input-hint">JPG, PNG, or WebP; up to 5 MB per image.</p></div></div>{photoBusy === animal.id && <p className="application-date">Uploading photo…</p>}</div>
    </article>)}</div>
  </div>;
}

function MedicalPanel({ rows, animals, busyKey, save }: {
  rows: MedicalRecordRow[]; animals: AnimalRow[]; busyKey: string; save: (record: Record<string, unknown>, id: string | null) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState<MedicalRecordRow | null>(null);
  const [adding, setAdding] = useState(false);
  const [formError, setFormError] = useState('');
  async function saveRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setFormError('');
    const form = new FormData(event.currentTarget);
    const record = { animal_id: String(form.get('animal_id')), record_type: String(form.get('record_type')), record_date: String(form.get('record_date')), summary: String(form.get('summary')).trim(), details: String(form.get('details') || '').trim(), adopter_visible: form.get('adopter_visible') === 'on' };
    try { const saved = await save(record, editing?.id ?? null); if (saved) { setEditing(null); setAdding(false); } }
    catch (cause) { setFormError(requestError(cause, 'Medical record could not be saved. Check the form and try again.')); }
  }
  return <div className="staff-panel"><div className="staff-panel-heading"><h2 className="visually-hidden">Medical records</h2><button type="button" className="button button-small button-secondary" onClick={() => { setAdding(true); setEditing(null); }}>Add a record</button></div>
    {formError && <Message kind="error">{formError}</Message>}
    {(adding || editing) && <form className="staff-form" onSubmit={saveRecord}><h3>{editing ? 'Edit medical record' : 'Add medical record'}</h3>
      <div className="form-grid"><div className="field"><label htmlFor="record-animal">Pet</label><select id="record-animal" name="animal_id" required defaultValue={editing?.animal_id ?? ''}><option value="">Choose a pet</option>{animals.map((animal) => <option key={animal.id} value={animal.id}>{animal.name}</option>)}</select></div><div className="field"><label htmlFor="record-type">Record type</label><select id="record-type" name="record_type" required defaultValue={editing?.record_type ?? 'vaccination'}><option value="vaccination">Vaccination</option><option value="treatment">Treatment</option><option value="medication">Medication</option><option value="other">Other</option></select></div><div className="field"><label htmlFor="record-date">Record date</label><input id="record-date" name="record_date" type="date" required defaultValue={editing?.record_date ?? new Date().toISOString().slice(0, 10)} /></div><div className="field"><label htmlFor="record-summary">Summary</label><input id="record-summary" name="summary" required maxLength={300} defaultValue={editing?.summary ?? ''} /></div></div>
      <div className="field"><label htmlFor="record-details">Details</label><textarea id="record-details" name="details" rows={4} maxLength={4000} defaultValue={editing?.details ?? ''} /></div><label className="staff-checkbox"><input type="checkbox" name="adopter_visible" defaultChecked={editing?.adopter_visible ?? false} /> Share this medical record with signed-in adopters</label>
      <div className="staff-actions"><button type="submit" className="button" disabled={busyKey.startsWith('medical-')}>{busyKey.startsWith('medical-') ? 'Saving…' : 'Save record'}</button><button type="button" className="button button-secondary" onClick={() => { setEditing(null); setAdding(false); }}>Cancel</button></div>
    </form>}
    {!rows.length && !adding && <EmptyPanel title="No medical records" body="Medical records for shelter animals will appear here." />}
    <div className="staff-record-list">{rows.map(row => (
      <article className="staff-record" key={row.id}>
        <div className="staff-record-heading">
          <div className="staff-title-line">
            <h3>{row.animal?.name ?? 'Pet listing'}</h3>
            <StatusBadge status={row.adopter_visible ? 'shared with adopters' : 'staff only'} />
          </div>
        </div>
        <dl className="staff-details">
          <div><dt>Type:</dt><dd>{formatStatus(row.record_type)}</dd></div>
          <div><dt>Date:</dt><dd>{dateOnly(row.record_date)}</dd></div>
          <div><dt>Summary:</dt><dd>{row.summary}</dd></div>
          {row.details && <div><dt>Notes:</dt><dd>{row.details}</dd></div>}
        </dl>
        <div className="staff-actions">
          <button type="button" className="button button-secondary" onClick={() => { setEditing(row); setAdding(false); }}>Edit record</button>
        </div>
      </article>
    ))}</div>
  </div>;
}

function AdoptionsPanel({ rows }: { rows: AdoptionRow[] }) {
  if (!rows.length) return <EmptyPanel title="No completed adoptions yet" body="When an approved application is completed, its adoption record will appear here." />;
  return <div className="staff-panel">
    <h2 className="visually-hidden">Completed adoptions</h2>
    <div className="staff-record-list">{rows.map(row => (
      <article className="staff-record" key={row.id}>
        <div className="staff-record-heading">
          <div>
            <div className="staff-title-line"><h3>{row.animal?.name ?? 'Pet listing'}</h3><StatusBadge status="completed" label="Adopted" /></div>
            <p>Adopted: {dateTime(row.adopted_at)}</p>
          </div>
        </div>
        <dl className="staff-details">
          <div><dt>Name:</dt><dd>{row.contact_name || 'Name not recorded'}</dd></div>
          {row.contact_email && <div><dt>Email:</dt><dd>{row.contact_email}</dd></div>}
          {row.contact_phone && <div><dt>Phone:</dt><dd>{row.contact_phone}</dd></div>}
        </dl>
      </article>
    ))}</div>
  </div>;
}

function EmptyPanel({ title, body }: { title: string; body: string }) {
  return <div className="staff-panel"><div className="empty-state"><h2>{title}</h2><p>{body}</p></div></div>;
}
function StatusBadge({ status, label }: { status: string; label?: string }) {
  const className = status === 'approved' || status === 'available' || status === 'completed' || status === 'shared with adopters' ? 'status-badge status-approved' : status === 'rejected' || status === 'adopted' || status === 'staff only' ? 'status-badge status-rejected' : status === 'pending' || status === 'submitted' ? 'status-badge status-pending' : status === 'fostered' ? 'status-badge status-fostered' : 'status-badge';
  return <span className={className}>{formatStatus(label || status)}</span>;
}
