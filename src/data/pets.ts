import { supabase } from '../lib/supabase';
import { petPhotos } from './petPhotos';

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
  photoUrl: string | null;
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
  animal_photos?: { photo_url: string; display_order: number; storage_path: string | null }[] | null;
};

export function formatAge(ageMonths: number | null) {
  if (ageMonths === null) return null;
  if (ageMonths < 12) return `${ageMonths} months`;
  const years = Math.floor(ageMonths / 12);
  const months = ageMonths % 12;
  return months === 0
    ? `${years} ${years === 1 ? 'year' : 'years'}`
    : `${years}y ${months}m`;
}

function mapAnimal(row: AnimalRow): Pet {
  const firstPhoto = row.animal_photos?.slice().sort((a, b) => a.display_order - b.display_order)[0];
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
    photoUrl: firstPhoto?.storage_path ? firstPhoto.photo_url : petPhotos[row.id] || firstPhoto?.photo_url || null,
  };
}

export async function getPets(): Promise<Pet[]> {
  const { data, error } = await supabase
    .from('animals')
    .select(
      'id, name, species, breed, age_months, description, care_needs, adoption_status, animal_photos(photo_url, display_order, storage_path)',
    )
    .eq('listing_visible', true)
    .order('name');

  if (error) throw error;
  return (data as AnimalRow[]).map(mapAnimal);
}

export interface MedicalRecord {
  id: string;
  record_type: string;
  record_date: string;
  summary: string;
  details: string;
}

export async function getMedicalRecords(
  petId: string,
): Promise<MedicalRecord[]> {
  const { data, error } = await supabase
    .from('medical_records')
    .select('id, record_type, record_date, summary, details')
    .eq('animal_id', petId)
    .eq('adopter_visible', true)
    .order('record_date', { ascending: false });

  if (error) throw error;
  return data ?? [];
}
