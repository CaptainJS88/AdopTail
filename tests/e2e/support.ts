import type { Page, Route } from '@playwright/test';

export const pets = [
  {
    id: 'maple-test-id',
    name: 'Maple',
    species: 'Dog',
    breed: 'Golden Retriever',
    age_months: 18,
    description: 'Friendly and enjoys walks.',
    care_needs: 'Daily exercise and regular brushing.',
    adoption_status: 'available',
    listing_visible: true,
    animal_photos: [],
  },
  {
    id: 'juniper-test-id',
    name: 'Juniper',
    species: 'Cat',
    breed: 'Domestic Shorthair',
    age_months: 30,
    description: 'Calm adult cat who likes sunny windows.',
    care_needs: 'Indoor home and daily play.',
    adoption_status: 'pending',
    listing_visible: true,
    animal_photos: [],
  },
  {
    id: 'catrina-test-id',
    name: 'Catrina',
    species: 'Cat',
    breed: 'Orange Tabby',
    age_months: 12,
    description: 'Sassy adult cat.',
    care_needs: 'Indoor home.',
    adoption_status: 'adopted',
    listing_visible: true,
    animal_photos: [],
  },
  {
    id: 'spot-test-id',
    name: 'Spot',
    species: 'Dog',
    breed: 'Dalmatian',
    age_months: 84,
    description: 'Calm elderly dog that loves naps.',
    care_needs: 'Daily exercise and extra nutrition.',
    adoption_status: 'fostered',
    listing_visible: true,
    animal_photos: [],
  },
];

type TestRole = 'adopter' | 'staff' | 'unapproved-staff' | 'anonymous';

type WorkflowPayload = Record<string, unknown>;

export type MockCalls = {
  adoptionApplication: WorkflowPayload | null;
  appointmentRequest: WorkflowPayload | null;
  applicationDecision: WorkflowPayload | null;
};

const adopterId = '10000000-0000-4000-8000-000000000001';
const staffId = '10000000-0000-4000-8000-000000000002';
const applicationId = '20000000-0000-4000-8000-000000000001';

function json(route: Route, body: unknown) {
  return route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

export async function mockSupabase(
  page: Page,
  role: TestRole = 'anonymous',
): Promise<MockCalls> {
  const calls: MockCalls = {
    adoptionApplication: null,
    appointmentRequest: null,
    applicationDecision: null,
  };
  let adoptionSubmitted = false;
  let staffApplicationStatus = 'submitted';

  if (role !== 'anonymous') {
    const isStaff = role === 'staff';
    const user = {
      id: isStaff ? staffId : adopterId,
      aud: 'authenticated',
      role: 'authenticated',
      email: isStaff ? 'staff@example.test' : 'adopter@example.test',
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: { display_name: isStaff ? 'Staff Tester' : 'Taylor Adopter' },
      created_at: '2026-01-01T00:00:00.000Z',
    };
    await page.addInitScript(({ user }) => {
      const session = {
        access_token: 'e2e-access-token',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: 'e2e-refresh-token',
        user,
      };
      window.localStorage.setItem('sb-127-auth-token', JSON.stringify(session));
    }, { user });
  }

  await page.route('**/auth/v1/**', async (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      return route.fulfill({ status: 204 });
    }
    return json(route, {
      id: role === 'staff' ? staffId : adopterId,
      email: role === 'staff' ? 'staff@example.test' : 'adopter@example.test',
      user_metadata: { display_name: role === 'staff' ? 'Staff Tester' : 'Taylor Adopter' },
    });
  });

  await page.route('**/rest/v1/**', async (route) => {
    const request = route.request();
    const { pathname, searchParams } = new URL(request.url());

    if (request.method() === 'OPTIONS') {
      return route.fulfill({ status: 204 });
    }

    if (pathname.endsWith('/rpc/submit_adoption_application')) {
      calls.adoptionApplication = request.postDataJSON() as WorkflowPayload;
      adoptionSubmitted = true;
      return json(route, null);
    }
    if (pathname.endsWith('/rpc/submit_appointment_request')) {
      calls.appointmentRequest = request.postDataJSON() as WorkflowPayload;
      return json(route, null);
    }
    if (pathname.endsWith('/rpc/decide_adoption_application')) {
      calls.applicationDecision = request.postDataJSON() as WorkflowPayload;
      staffApplicationStatus = String(calls.applicationDecision.p_decision);
      return json(route, null);
    }

    const table = pathname.split('/').pop();
    if (table === 'animals') return json(route, pets);
    if (table === 'profiles') {
      if (searchParams.has('id') && searchParams.get('id')?.startsWith('in.')) {
        return json(route, [{ id: adopterId, display_name: 'Taylor Adopter', phone: '8175550100', city: 'Arlington' }]);
      }
      return json(route, {
        role: role === 'staff' || role === 'unapproved-staff' ? 'staff' : 'adopter',
        staff_access_approved: role === 'staff',
      });
    }
    if (table === 'medical_records') {
      return json(route, role === 'adopter' ? [
        {
          id: '30000000-0000-4000-8000-000000000001',
          animal_id: pets[0].id,
          record_type: 'vaccination',
          record_date: '2026-10-20',
          summary: 'Vaccinations up to date',
          details: 'Routine vaccinations were completed at the latest checkup.',
          adopter_visible: true,
        },
      ] : []);
    }
    if (table === 'appointments' || table === 'adoptions' || table === 'animal_photos') {
      return json(route, []);
    }
    if (table === 'adoption_applications') {
      if (role === 'staff') {
        return json(route, [
          {
            id: applicationId,
            animal_id: pets[0].id,
            adopter_id: adopterId,
            reason: 'Ready to provide a loving home.',
            status: staffApplicationStatus,
            submitted_at: '2026-11-01T15:00:00.000Z',
            decided_at: staffApplicationStatus === 'submitted' ? null : '2026-11-02T15:00:00.000Z',
            contact_name: 'Taylor Adopter',
            contact_email: 'adopter@example.test',
            contact_phone: '8175550100',
            city: 'Arlington',
            housing_type: 'Apartment',
            home_ownership: 'Rent',
            pet_permission: 'Yes',
            household: 'Two adults',
            other_pets: 'None',
            experience: 'First-time adopter',
            daily_care: 'Daily walks and play.',
            animal: { name: 'Maple' },
          },
        ]);
      }
      return json(route, adoptionSubmitted ? [
        {
          id: applicationId,
          status: 'submitted',
          submitted_at: '2026-11-01T15:00:00.000Z',
          decided_at: null,
          animal: { name: 'Maple' },
        },
      ] : []);
    }

    return route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ message: `No E2E fixture for ${pathname}` }),
    });
  });

  return calls;
}

export function futureDateOnWeekday(targetDay: number) {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  while (date.getDay() !== targetDay) date.setDate(date.getDate() + 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
