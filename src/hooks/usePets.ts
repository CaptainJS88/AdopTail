import { useEffect, useState } from 'react';
import { getPets } from '../data/pets';
import type { Pet } from '../data/pets';

export function usePets() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    getPets()
      .then((results) => {
        if (active) setPets(results);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : 'Could not load shelter listings.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { pets, loading, error };
}
