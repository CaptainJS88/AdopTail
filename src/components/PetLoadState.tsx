import Message from './Message';

export default function PetLoadState({ loading, error, subject = 'shelter listings' }: { loading: boolean; error: string | null; subject?: string }) {
  if (loading) return <Message kind="loading">Loading {subject}...</Message>;
  if (error) return <Message kind="error">We could not load the {subject}. Please refresh the page to try again.</Message>;
  return null;
}
