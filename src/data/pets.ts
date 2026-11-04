import { supabase } from '../lib/supabase';

export interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  ageMonths: number | null;
  description: string;
  careNeeds: string;
  adoptionStatus: string;
  details: string;
}

type AnimalRow = {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  age_months: number | null;
  description: string;
  care_needs: string;
  adoption_status: string;
};

function formatAge(ageMonths: number | null) {
  if (ageMonths === null) return null;
  if (ageMonths < 12) return `${ageMonths} months`;
  const years = Math.floor(ageMonths / 12);
  const months = ageMonths % 12;
  return months === 0 ? `${years} ${years === 1 ? 'year' : 'years'}` : `${years}y ${months}m`;
}

function mapAnimal(row: AnimalRow): Pet {
  const details = [row.breed || row.species, formatAge(row.age_months)]
    .filter(Boolean)
    .join(' / ');

  return {
    id: row.id,
    name: row.name,
    species: row.species,
    breed: row.breed,
    ageMonths: row.age_months,
    description: row.description,
    careNeeds: row.care_needs,
    adoptionStatus: row.adoption_status,
    details,
  };
}

export async function getPets(): Promise<Pet[]> {
  const { data, error } = await supabase
    .from('animals')
    .select('id, name, species, breed, age_months, description, care_needs, adoption_status')
    .eq('listing_visible', true)
    .order('name');

  if (error) throw error;
  return (data as AnimalRow[]).map(mapAnimal);
}
