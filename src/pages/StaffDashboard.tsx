import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';
import Message from '../components/Message';
import { requestError } from '../lib/messages';

type AnimalPhoto = { id: string; animal_id: string; photo_url: string; alt_text: string; display_order: number; storage_path: string | null };
type AnimalRow = { id: string; name: string; species: string; breed: string | null; age_months: number | null; description: string; care_needs: string; adoption_status: string; listing_visible: boolean; photos: AnimalPhoto[] };
type ApplicationRow = { id: string; animal_id: string; adopter_id: string; reason: string; status: string; submitted_at: string; decided_at: string | null; contact_name: string | null; contact_email: string | null; contact_phone: string | null; city: string | null; housing_type: string | null; home_ownership: string | null; pet_permission: string | null; household: string | null; other_pets: string | null; experience: string | null; daily_care: string | null; animal: { name: string } | null };
type AppointmentRow = { id: string; animal_id: string; adopter_id: string; starts_at: string; status: string; created_at: string; contact_name: string | null; contact_email: string | null; contact_phone: string | null; visit_note: string | null; animal: { name: string } | null };
type MedicalRecordRow = { id: string; animal_id: string; record_type: string; record_date: string; summary: string; details: string; adopter_visible: boolean; animal: { name: string } | null };
type AdoptionRow = { id: string; animal_id: string; adopter_id: string; adopted_at: string; contact_name: string | null; contact_email: string | null; animal: { name: string } | null };
type RawAdoptionRow = Omit<AdoptionRow, 'contact_name' | 'contact_email'> & { application: { contact_name: string | null; contact_email: string | null } | null };
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
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
function dateOnly(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { dateStyle: 'medium' });
}
function localDateTimeValue(value: string) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
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

  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setLoadError('');
    const [animalsResult, applicationsResult, visitsResult, recordsResult, adoptionsResult] = await Promise.all([
      supabase.from('animals').select('id, name, species, breed, age_months, description, care_needs, adoption_status, listing_visible').order('name'),
      supabase.from('adoption_applications').select('id, animal_id, adopter_id, reason, status, submitted_at, decided_at, contact_name, contact_email, contact_phone, city, housing_type, home_ownership, pet_permission, household, other_pets, experience, daily_care, animal:animals(name)').order('submitted_at', { ascending: false }).returns<ApplicationRow[]>(),
      supabase.from('appointments').select('id, animal_id, adopter_id, starts_at, status, created_at, contact_name, contact_email, contact_phone, visit_note, animal:animals(name)').order('starts_at').returns<AppointmentRow[]>(),
      supabase.from('medical_records').select('id, animal_id, record_type, record_date, summary, details, adopter_visible, animal:animals(name)').order('record_date', { ascending: false }).returns<MedicalRecordRow[]>(),
      supabase.from('adoptions').select('id, animal_id, adopter_id, adopted_at, animal:animals(name), application:adoption_applications(contact_name, contact_email)').order('adopted_at', { ascending: false }).returns<RawAdoptionRow[]>(),
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
    setApplications((applicationsResult.data ?? []) as ApplicationRow[]);
    setAppointments((visitsResult.data ?? []) as AppointmentRow[]);
    setMedicalRecords((recordsResult.data ?? []) as MedicalRecordRow[]);
    const adoptionRows = (adoptionsResult.data ?? []) as RawAdoptionRow[];
    setAdoptions(adoptionRows.map((row) => ({ ...row, contact_name: row.application?.contact_name ?? null, contact_email: row.application?.contact_email ?? null })));
    setLoading(false);
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  async function runAction(key: string, action: () => Promise<void>, success: string): Promise<boolean> {
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
      setBusyKey('');
    }
  }

  if (loading) return <section className="section container"><Message kind="loading">Loading staff dashboard...</Message></section>;

  return (
    <section className="section container staff-area" aria-labelledby="staff-title">
      <div className="staff-heading">
        <div className="page-heading">
          <p className="staff-eyebrow">Shelter workspace</p>
          <h1 id="staff-title">Staff dashboard</h1>
          <p>Review requests and keep shelter records up to date.</p>
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
          {section === 'applications' && <ApplicationsPanel rows={applications} busyKey={busyKey} decide={(row, decision) => runAction(`application-${row.id}`, async () => { const { error } = await supabase.rpc('decide_adoption_application', { p_application_id: row.id, p_decision: decision }); if (error) throw error; }, `Application ${decision}.`)} complete={(row) => runAction(`complete-${row.id}`, async () => { const { error } = await supabase.rpc('complete_adoption', { p_application_id: row.id }); if (error) throw error; }, 'Adoption recorded and pet marked adopted.')} />}
          {section === 'visits' && <VisitsPanel rows={appointments} busyKey={busyKey} decide={(row, decision) => runAction(`visit-${row.id}`, async () => { const { error } = await supabase.rpc('decide_appointment', { p_appointment_id: row.id, p_decision: decision }); if (error) throw error; }, `Visit ${decision}.`)} reschedule={(row, value) => runAction(`reschedule-${row.id}`, async () => { const { error } = await supabase.rpc('reschedule_appointment', { p_appointment_id: row.id, p_new_starts_at: new Date(value).toISOString() }); if (error) throw error; }, 'Visit rescheduled.')} />}
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
      <h2>Today at a glance</h2>
      <div className="staff-stat-grid">
        <button type="button" className="staff-stat" onClick={() => onNavigate('applications')}><span>Applications to review</span><strong>{pendingApplications}</strong></button>
        <button type="button" className="staff-stat" onClick={() => onNavigate('visits')}><span>Visits awaiting a decision</span><strong>{pendingVisits}</strong></button>
        <button type="button" className="staff-stat" onClick={() => onNavigate('animals')}><span>Animal listings</span><strong>{animals.length}</strong></button>
        <button type="button" className="staff-stat" onClick={() => onNavigate('medical')}><span>Medical records</span><strong>{medicalRecords.length}</strong></button>
        <button type="button" className="staff-stat" onClick={() => onNavigate('adoptions')}><span>Completed adoptions</span><strong>{adoptions.length}</strong></button>
      </div>
      <div className="staff-panel-note"><p>Use the sections above to review applications and visits, maintain pet records, and record completed adoptions.</p></div>
    </div>
  );
}

function ApplicationsPanel({ rows, busyKey, decide, complete }: {
  rows: ApplicationRow[]; busyKey: string; decide: (row: ApplicationRow, decision: 'approved' | 'rejected') => void; complete: (row: ApplicationRow) => void;
}) {
  if (!rows.length) return <EmptyPanel title="No applications yet" body="New adoption applications will appear here." />;
  return <div className="staff-panel"><div className="staff-panel-heading"><h2>Adoption applications</h2><span>{rows.length} total</span></div><div className="staff-record-list">{rows.map((row) => (
    <article className="staff-record" key={row.id}>
      <div className="staff-record-heading"><div><h3>{row.animal?.name ?? 'Pet listing'}</h3><p>Submitted {dateTime(row.submitted_at)}</p></div><StatusBadge status={row.status} /></div>
      <dl className="staff-details">
        <div><dt>Applicant</dt><dd>{display(row.contact_name)}</dd></div><div><dt>Email</dt><dd>{display(row.contact_email)}</dd></div><div><dt>Phone</dt><dd>{display(row.contact_phone)}</dd></div><div><dt>City</dt><dd>{display(row.city)}</dd></div>
        <div><dt>Housing</dt><dd>{display(row.housing_type)}</dd></div><div><dt>Own or rent</dt><dd>{display(row.home_ownership)}</dd></div><div><dt>Pets allowed</dt><dd>{display(row.pet_permission)}</dd></div><div><dt>Household</dt><dd>{display(row.household)}</dd></div>
        <div><dt>Other pets</dt><dd>{display(row.other_pets)}</dd></div><div><dt>Experience</dt><dd>{display(row.experience)}</dd></div><div><dt>Daily care plan</dt><dd>{display(row.daily_care)}</dd></div><div><dt>Reason</dt><dd>{display(row.reason)}</dd></div>
      </dl>
      {row.status === 'submitted' && <div className="staff-actions"><button type="button" className="button" disabled={busyKey === `application-${row.id}`} onClick={() => { if (window.confirm(`Approve the application for ${row.animal?.name ?? 'this pet'}?`)) decide(row, 'approved'); }}>{busyKey === `application-${row.id}` ? 'Saving…' : 'Approve'}</button><button type="button" className="button button-secondary" disabled={busyKey === `application-${row.id}`} onClick={() => { if (window.confirm('Reject this adoption application?')) decide(row, 'rejected'); }}>Reject</button></div>}
      {row.status === 'approved' && <div className="staff-actions"><button type="button" className="button" disabled={busyKey === `complete-${row.id}`} onClick={() => { if (window.confirm(`Record the completed adoption of ${row.animal?.name ?? 'this pet'}?`)) complete(row); }}>{busyKey === `complete-${row.id}` ? 'Saving…' : 'Record completed adoption'}</button></div>}
    </article>
  ))}</div></div>;
}

function VisitsPanel({ rows, busyKey, decide, reschedule }: {
  rows: AppointmentRow[]; busyKey: string; decide: (row: AppointmentRow, decision: 'approved' | 'rejected') => void; reschedule: (row: AppointmentRow, value: string) => void;
}) {
  const [times, setTimes] = useState<Record<string, string>>({});
  if (!rows.length) return <EmptyPanel title="No visit requests yet" body="New visit requests will appear here." />;
  return <div className="staff-panel"><div className="staff-panel-heading"><h2>Visit requests</h2><span>{rows.length} total</span></div><div className="staff-record-list">{rows.map((row) => (
    <article className="staff-record" key={row.id}>
      <div className="staff-record-heading"><div><h3>{row.animal?.name ?? 'Pet listing'}</h3><p>Requested visit: {dateTime(row.starts_at)}</p></div><StatusBadge status={row.status} /></div>
      <dl className="staff-details"><div><dt>Requester</dt><dd>{display(row.contact_name)}</dd></div><div><dt>Email</dt><dd>{display(row.contact_email)}</dd></div><div><dt>Phone</dt><dd>{display(row.contact_phone)}</dd></div><div><dt>Question</dt><dd>{display(row.visit_note)}</dd></div><div><dt>Request received</dt><dd>{dateTime(row.created_at)}</dd></div></dl>
      {row.status === 'pending' && <div className="staff-actions"><button type="button" className="button" disabled={busyKey === `visit-${row.id}`} onClick={() => { if (window.confirm(`Approve the visit request for ${row.animal?.name ?? 'this pet'}?`)) decide(row, 'approved'); }}>Approve visit</button><button type="button" className="button button-secondary" disabled={busyKey === `visit-${row.id}`} onClick={() => { if (window.confirm('Reject this visit request?')) decide(row, 'rejected'); }}>Reject</button></div>}
      {row.status === 'approved' && <form className="staff-reschedule" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const value = times[row.id] || localDateTimeValue(row.starts_at); if (window.confirm('Save this new visit time?')) reschedule(row, value); }}><label htmlFor={`reschedule-${row.id}`}>Reschedule approved visit</label><div className="staff-actions"><input id={`reschedule-${row.id}`} type="datetime-local" required min={localDateTimeValue(new Date().toISOString())} value={times[row.id] ?? localDateTimeValue(row.starts_at)} onChange={(event) => setTimes((current) => ({ ...current, [row.id]: event.target.value }))} /><button type="submit" className="button button-secondary" disabled={busyKey === `reschedule-${row.id}`}>{busyKey === `reschedule-${row.id}` ? 'Saving…' : 'Save new time'}</button></div></form>}
    </article>
  ))}</div></div>;
}

function AnimalsPanel({ rows, busyKey, onRefresh, save, setHidden, setFoster }: {
  rows: AnimalRow[]; busyKey: string; onRefresh: () => Promise<void>; save: (id: string | null, values: Record<string, unknown>) => Promise<boolean>; setHidden: (row: AnimalRow) => void; setFoster: (row: AnimalRow) => void;
}) {
  const [editing, setEditing] = useState<AnimalRow | null>(null);
  const [adding, setAdding] = useState(false);
  const [formError, setFormError] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [photoBusy, setPhotoBusy] = useState('');
  const [altText, setAltText] = useState('');
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
        const { error: insertError } = await supabase.from('animal_photos').insert({ animal_id: animal.id, photo_url: data.publicUrl, storage_path: path, alt_text: altText.trim() || `${animal.name}, shelter pet`, display_order: animal.photos.length + Array.from(files).indexOf(file) });
        if (insertError) {
          await supabase.storage.from('animal-photos').remove([path]);
          throw insertError;
        }
      }
      setAltText('');
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
    <div className="staff-panel-heading"><h2>Animal listings</h2><button className="button button-small" type="button" onClick={() => { setAdding(true); setEditing(null); }}>Add a pet</button></div>
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
      <div className="staff-record-heading"><div><h3>{animal.name}</h3><p>{[animal.species, animal.breed, animal.age_months === null ? null : `${animal.age_months} months`].filter(Boolean).join(' · ')}</p></div><StatusBadge status={animal.adoption_status} /></div>
      <p className="staff-animal-copy">{animal.description}</p><p className="staff-animal-copy">Care needs: {display(animal.care_needs)}</p>
      <div className="staff-actions"><button type="button" className="button button-secondary" onClick={() => { setEditing(animal); setAdding(false); }}>Edit listing</button><button type="button" className="button button-secondary" disabled={busyKey === `hidden-${animal.id}`} onClick={() => setHidden(animal)}>{animal.listing_visible ? 'Hide from adopters' : 'Show to adopters'}</button>{['available', 'fostered'].includes(animal.adoption_status) && <button type="button" className="button button-secondary" disabled={busyKey === `foster-${animal.id}`} onClick={() => setFoster(animal)}>{animal.adoption_status === 'fostered' ? 'Return to available' : 'Mark fostered'}</button>}</div>
      <div className="staff-photos"><h4>Photos</h4>{animal.photos.length > 0 && <div className="staff-photo-grid">{animal.photos.map((photo) => <figure key={photo.id}><img src={photo.photo_url} alt={photo.alt_text || `${animal.name}, shelter pet`} /><figcaption><span>{photo.alt_text || 'Pet photo'}</span><span className="staff-photo-actions"><label className="button button-small button-secondary" htmlFor={`photo-replace-${photo.id}`}>Replace</label><input className="visually-hidden" id={`photo-replace-${photo.id}`} type="file" accept="image/jpeg,image/png,image/webp" disabled={photoBusy === photo.id} onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) void replacePhoto(animal, photo, file); event.currentTarget.value = ''; }} /><button type="button" className="text-button" disabled={photoBusy === photo.id} onClick={() => { if (window.confirm('Remove this pet photo?')) void removePhoto(photo); }}>Remove</button></span></figcaption></figure>)}</div>}<div className="staff-upload"><div className="field"><label htmlFor={`photo-alt-${animal.id}`}>Photo description</label><input id={`photo-alt-${animal.id}`} value={altText} maxLength={200} onChange={(event) => setAltText(event.target.value)} placeholder={`Describe ${animal.name}'s photo`} /></div><div className="field"><label htmlFor={`photo-upload-${animal.id}`}>Upload pet photos</label><input id={`photo-upload-${animal.id}`} type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={photoBusy === animal.id} onChange={(event) => { void uploadPhotos(animal, event.target.files); event.currentTarget.value = ''; }} /><p className="input-hint">JPG, PNG, or WebP; up to 5 MB per image.</p></div></div>{photoBusy === animal.id && <p className="application-date">Uploading photo…</p>}</div>
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
  return <div className="staff-panel"><div className="staff-panel-heading"><h2>Medical records</h2><button type="button" className="button button-small" onClick={() => { setAdding(true); setEditing(null); }}>Add a record</button></div>
    {formError && <Message kind="error">{formError}</Message>}
    {(adding || editing) && <form className="staff-form" onSubmit={saveRecord}><h3>{editing ? 'Edit medical record' : 'Add medical record'}</h3>
      <div className="form-grid"><div className="field"><label htmlFor="record-animal">Pet</label><select id="record-animal" name="animal_id" required defaultValue={editing?.animal_id ?? ''}><option value="">Choose a pet</option>{animals.map((animal) => <option key={animal.id} value={animal.id}>{animal.name}</option>)}</select></div><div className="field"><label htmlFor="record-type">Record type</label><select id="record-type" name="record_type" required defaultValue={editing?.record_type ?? 'vaccination'}><option value="vaccination">Vaccination</option><option value="treatment">Treatment</option><option value="medication">Medication</option><option value="other">Other</option></select></div><div className="field"><label htmlFor="record-date">Record date</label><input id="record-date" name="record_date" type="date" required defaultValue={editing?.record_date ?? new Date().toISOString().slice(0, 10)} /></div><div className="field"><label htmlFor="record-summary">Summary</label><input id="record-summary" name="summary" required maxLength={300} defaultValue={editing?.summary ?? ''} /></div></div>
      <div className="field"><label htmlFor="record-details">Details</label><textarea id="record-details" name="details" rows={4} maxLength={4000} defaultValue={editing?.details ?? ''} /></div><label className="staff-checkbox"><input type="checkbox" name="adopter_visible" defaultChecked={editing?.adopter_visible ?? false} /> Share this medical record with signed-in adopters</label>
      <div className="staff-actions"><button type="submit" className="button" disabled={busyKey.startsWith('medical-')}>{busyKey.startsWith('medical-') ? 'Saving…' : 'Save record'}</button><button type="button" className="button button-secondary" onClick={() => { setEditing(null); setAdding(false); }}>Cancel</button></div>
    </form>}
    {!rows.length && !adding && <EmptyPanel title="No medical records" body="Medical records for shelter animals will appear here." />}
    <div className="staff-record-list">{rows.map((row) => <article className="staff-record" key={row.id}><div className="staff-record-heading"><div><h3>{row.animal?.name ?? 'Pet listing'}</h3><p>{row.record_type} · {dateOnly(row.record_date)}</p></div><StatusBadge status={row.adopter_visible ? 'shared with adopters' : 'staff only'} /></div><h4>{row.summary}</h4>{row.details && <p className="staff-animal-copy">{row.details}</p>}<div className="staff-actions"><button type="button" className="button button-secondary" onClick={() => { setEditing(row); setAdding(false); }}>Edit record</button></div></article>)}</div>
  </div>;
}

function AdoptionsPanel({ rows }: { rows: AdoptionRow[] }) {
  if (!rows.length) return <EmptyPanel title="No completed adoptions yet" body="When an approved application is completed, its adoption record will appear here." />;
  return <div className="staff-panel"><div className="staff-panel-heading"><h2>Completed adoptions</h2><span>{rows.length} total</span></div><div className="staff-record-list">{rows.map((row) => <article className="staff-record" key={row.id}><div className="staff-record-heading"><div><h3>{row.animal?.name ?? 'Pet listing'}</h3><p>Adopted {dateTime(row.adopted_at)}</p></div><StatusBadge status="completed" /></div><dl className="staff-details"><div><dt>Adopter</dt><dd>{display(row.contact_name)}</dd></div><div><dt>Email</dt><dd>{display(row.contact_email)}</dd></div><div><dt>Adoption ID</dt><dd>{row.id}</dd></div></dl></article>)}</div></div>;
}

function EmptyPanel({ title, body }: { title: string; body: string }) {
  return <div className="staff-panel"><div className="empty-state"><h2>{title}</h2><p>{body}</p></div></div>;
}
function StatusBadge({ status }: { status: string }) {
  const className = status === 'approved' || status === 'available' || status === 'completed' || status === 'shared with adopters' ? 'status-badge status-approved' : status === 'rejected' || status === 'adopted' || status === 'staff only' ? 'status-badge status-rejected' : status === 'pending' ? 'status-badge status-pending' : status === 'fostered' ? 'status-badge status-fostered' : 'status-badge';
  return <span className={className}>{status.replace(/_/g, ' ')}</span>;
}
