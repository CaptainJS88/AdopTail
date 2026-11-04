export default function PetLoadState({ loading, error }: { loading: boolean; error: string | null }) {
  if (loading) return <p className="hero-description" role="status">Loading shelter listings…</p>;
  if (error) return <p className="hero-description" role="alert">Unable to load shelter listings: {error}</p>;
  return null;
}
