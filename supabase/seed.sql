--inserting animals in shelter 
insert into public.animals (
  id, name, species, breed, age_months, description, care_needs
)
values
  (
    '10000000-0000-4000-8000-000000000001',
    'Maple', 'Dog', 'Golden Retriever', 18,
    'Friendly and enjoys walks.',
    'Daily exercise and regular brushing.'
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'Juniper', 'Cat', 'Domestic Shorthair', 30,
    'Calm adult cat who likes sunny windows.',
    'Indoor home and daily play.'
  ),
  (
    '10000000-0000-4000-8000-000000000003',
    'Joe', 'Dog', 'Chiquaqua', 7,
    'Excited puppy who loves treats and belly rubs.',
    'Outdoor exposure and social settings.'
  ),
  (
    '10000000-0000-4000-8000-000000000004',
    'Catrina', 'Cat', 'Orange Tabby', 12,
    'Sassy adult cat.',
    'Indoor home and allergy prone.'
  ),
  (
    '10000000-0000-4000-8000-000000000005',
    'Spot', 'Dog', 'Dalmation', 45,
    'Calm elderly dog that loves naps.',
    'Daily exercise and extra nutrition.'
  )
on conflict (id) do nothing;

--associated photos
insert into public.animal_photos (
  id, animal_id, photo_url, alt_text, display_order
)
values
  (
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'https://storage.dogster.com/_cache/v1/01aed617e5f4bc10417d686e62ce34b11458f465.jpeg',
    'Maple frolicing outdoors',
    0
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002',
    'https://d3544la1u8djza.cloudfront.net/APHI/Blog/2022/02-11/orange+domestic+shorthair+tabby+cat+lying+on+carpet+next+to+a+Christmas+tree-min.jpg',
    'Juniper gazing into the distance',
    0
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000003',
    'https://www.adoptapet.com/_next/image?url=https%3A%2F%2Fimages.ctfassets.net%2Fscac5p2hkp4h%2Fdeibo9dVjl1e8Ozy3X91L%2F1582315f1065d9b85e5df0ac8d48493e%2Faap-inline-chihuauha-2-play.webp&w=2048&q=75$0',
    'Joe playing with his toys...and some socks',
    0
  ),
  (
    '20000000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000004',
    'hhttps://images.petful.com/posts/orange-tabby-cat/orange-tabby-personality.webp',
    'Catrina demanding pets',
    0
  ),
  (
    '20000000-0000-4000-8000-000000000005',
    '10000000-0000-4000-8000-000000000005',
    'https://www.shutterstock.com/shutterstock/videos/1021813000/thumb/1.jpg?ip=x480',
    'Spot resting indoors',
    0
  )

on conflict (id) do nothing;

--associated medical records
insert into public.medical_records (
  id, animal_id, record_type, record_date, summary, details, adopter_visible
)
values
  (
    '30000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'vaccination', '2026-09-20',
    'Core vaccinations up to date',
    'Routine shelter wellness visit.',
    true
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002',
    'medication', '2026-08-07',
    'Heartworm medication, no reoccurance since',
    'Needs follow up blood test until June.',
    true
  ),
  (
    '30000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000002',
    'vaccination', '2026-10-01',
    'Core vaccinations up to date',
    'Routine shelter wellness visit.',
    true
  ),
  (
    '30000000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000003',
    'vaccination', '2026-02-23',
    'Core vaccinations up to date',
    'Routine shelter wellness visit.',
    true
  ),
  (
    '30000000-0000-4000-8000-000000000005',
    '10000000-0000-4000-8000-000000000004',
    'vaccination', '2026-09-20',
    'Core vaccinations up to date',
    'Routine shelter wellness visit.',
    true
  ),
  (
    '30000000-0000-4000-8000-000000000006',
    '10000000-0000-4000-8000-000000000005',
    'treatment', '2025-05-23',
    'Wound repair',
    'Had a wound on hind leg and received surgury to aid in healing.',
    true
  )
on conflict (id) do nothing;

-- `npx supabase db reset`. Do not add real user accounts or workflow records.
