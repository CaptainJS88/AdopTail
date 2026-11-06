import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';

export type ContactDetails = { fullName: string; phone: string; city: string };
type ProfileValue = { details: ContactDetails; updateDetails: (details: ContactDetails) => void };
const ProfileContext = createContext<ProfileValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [draft, setDraft] = useState<{ userId: string | undefined; details: ContactDetails } | null>(null);

  useEffect(() => setDraft(null), [userId]);

  const details = draft && draft.userId === userId ? draft.details : {
    fullName: String(session?.user.user_metadata.display_name || ''),
    phone: '',
    city: '',
  };

  function updateDetails(next: ContactDetails) {
    setDraft({ userId, details: next });
  }

  return <ProfileContext.Provider value={{ details, updateDetails }}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const value = useContext(ProfileContext);
  if (!value) throw new Error('ProfileProvider is required');
  return value;
}
