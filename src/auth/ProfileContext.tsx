import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

export type ContactDetails = { fullName: string; phone: string; city: string };
type ProfileValue = {
  details: ContactDetails;
  updateDetails: (details: ContactDetails) => void;
  role: string | null;
  staffAccessApproved: boolean;
  profileLoading: boolean;
  profileError: string | null;
};
const ProfileContext = createContext<ProfileValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const userId = session?.user.id;
  const [draft, setDraft] = useState<{ userId: string | undefined; details: ContactDetails } | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [staffAccessApproved, setStaffAccessApproved] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => setDraft(null), [userId]);

  useEffect(() => {
    let active = true;
    if (authLoading) return () => { active = false; };
    if (!userId) {
      setRole(null);
      setStaffAccessApproved(false);
      setProfileError(null);
      setProfileLoading(false);
      return () => { active = false; };
    }

    setProfileLoading(true);
    setProfileError(null);
    Promise.resolve(
      supabase
        .from('profiles')
        .select('role, staff_access_approved')
        .eq('id', userId)
        .maybeSingle(),
    ).then(({ data, error }) => {
        if (!active) return;
        if (error || !data) {
          setRole(null);
          setStaffAccessApproved(false);
          setProfileError(error?.message || 'Your profile could not be loaded.');
        } else {
          setRole(data.role);
          setStaffAccessApproved(data.staff_access_approved);
        }
        setProfileLoading(false);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setRole(null);
        setStaffAccessApproved(false);
        setProfileError(cause instanceof Error ? cause.message : 'Your profile could not be loaded.');
        setProfileLoading(false);
      });
    return () => { active = false; };
  }, [userId, authLoading]);

  const details = draft && draft.userId === userId ? draft.details : {
    fullName: String(session?.user.user_metadata.display_name || ''),
    phone: '',
    city: '',
  };

  function updateDetails(next: ContactDetails) {
    setDraft({ userId, details: next });
  }

  return <ProfileContext.Provider value={{ details, updateDetails, role, staffAccessApproved, profileLoading, profileError }}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const value = useContext(ProfileContext);
  if (!value) throw new Error('ProfileProvider is required');
  return value;
}
