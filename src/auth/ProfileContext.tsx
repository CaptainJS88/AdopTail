import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import { requestError } from '../lib/messages';

export type ContactDetails = { fullName: string; phone: string; city: string };
type ProfileValue = {
  details: ContactDetails;
  loading: boolean;
  error: string;
  reload: () => void;
  updateDetails: (details: ContactDetails) => Promise<void>;
  role: string | null;
  staffAccessApproved: boolean;
  profileLoading: boolean;
  profileError: string | null;
};
const ProfileContext = createContext<ProfileValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const userId = session?.user.id;
  const accountName = String(session?.user.user_metadata.display_name || '');
  const [profile, setProfile] = useState<{ userId: string; details: ContactDetails; role: string; staffAccessApproved: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    if (authLoading) return;
    setProfile(null);
    setError('');
    setLoading(Boolean(userId));
    if (!userId) return;
    const id = userId;

    async function loadProfile() {
      try {
        const { data, error: loadError } = await supabase.from('profiles')
          .select('display_name, phone, city, role, staff_access_approved').eq('id', id).single();
        if (loadError) throw loadError;
        if (active) setProfile({ userId: id, role: data.role, staffAccessApproved: data.staff_access_approved, details: {
          fullName: data.display_name || accountName, phone: data.phone || '', city: data.city || '',
        } });
      } catch (cause) {
        if (active) setError(requestError(cause, 'We could not load your profile. Please try again.'));
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadProfile();
    return () => { active = false; };
  }, [userId, accountName, authLoading, attempt]);

  const details = profile && profile.userId === userId ? profile.details : {
    fullName: accountName, phone: '', city: '',
  };

  async function updateDetails(next: ContactDetails) {
    if (!userId) throw new Error('Please sign in to update your profile.');
    const { data, error: saveError } = await supabase.from('profiles').update({
      display_name: next.fullName.trim(),
      phone: next.phone.replace(/\D/g, ''),
      city: next.city.trim(),
    }).eq('id', userId).select('display_name, phone, city, role, staff_access_approved').single();
    if (saveError) throw saveError;
    setProfile({ userId, role: data.role, staffAccessApproved: data.staff_access_approved, details: {
      fullName: data.display_name || accountName, phone: data.phone || '', city: data.city || '',
    } });
  }

  const currentProfile = profile?.userId === userId ? profile : null;
  const profileLoading = authLoading || loading;
  return <ProfileContext.Provider value={{
    details, loading: profileLoading, error, reload: () => setAttempt(value => value + 1), updateDetails,
    role: currentProfile?.role || null,
    staffAccessApproved: currentProfile?.staffAccessApproved || false,
    profileLoading, profileError: error || null,
  }}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const value = useContext(ProfileContext);
  if (!value) throw new Error('ProfileProvider is required');
  return value;
}
