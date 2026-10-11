export interface Pet {
  id: number;
  name: string;
  details: string;
}

// These are sample pets until we connect the backend.
export const pets: Pet[] = [
  {
    id: 1,
    name: 'Milo',
    details: 'Golden retriever mix / 2 years',
  },
  {
    id: 2,
    name: 'Luna',
    details: 'Domestic shorthair / 1 year',
  },
  {
    id: 3,
    name: 'Buddy',
    details: 'Border collie mix / 3 years',
  },
];
