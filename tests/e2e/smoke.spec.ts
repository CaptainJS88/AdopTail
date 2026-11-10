import { expect, test } from '@playwright/test';
import { futureDateOnWeekday, mockSupabase, pets } from './support';

test('pet search filters and clear filters update the listing', async ({ page }) => {
  await mockSupabase(page);
  await page.goto('/pets');

  await expect(page.getByRole('heading', { name: 'Search for a Pet' })).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('4 pets found');

  await page.getByLabel('Species').selectOption('Dog');
  await page.getByLabel('Availability').selectOption('available');
  await expect(page.getByRole('status')).toHaveText('1 pet found');
  await expect(page.getByRole('heading', { name: 'Maple', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Spot' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.getByRole('status')).toHaveText('4 pets found');
});

test('pet details show status-based actions and the signed-out medical gate', async ({ page }) => {
  await mockSupabase(page);
  await page.goto(`/pets/${pets[0].id}`);

  await expect(page.getByRole('heading', { name: 'Maple', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Apply for Maple' })).toHaveAttribute('href', `/adopt?pet=${pets[0].id}`);
  await expect(page.getByRole('link', { name: 'Schedule a visit' })).toHaveAttribute('href', `/visit?pet=${pets[0].id}`);
  await expect(page.getByText('to view medical information shared by the shelter.')).toBeVisible();

  await page.goto(`/pets/${pets[2].id}`);
  await expect(page.getByText('Catrina is not currently accepting adoption applications.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Schedule a visit' })).toHaveCount(0);
});

test('signed-in adopters can view shared medical information', async ({ page }) => {
  await mockSupabase(page, 'adopter');
  await page.goto(`/pets/${pets[0].id}`);

  await expect(page.getByRole('heading', { name: 'Maple', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Vaccinations up to date' })).toBeVisible();
  await expect(page.getByText('Routine vaccinations were completed at the latest checkup.')).toBeVisible();
});

test('adopter reviews and submits an application', async ({ page }) => {
  const calls = await mockSupabase(page, 'adopter');
  await page.goto(`/adopt?pet=${pets[0].id}`);

  await expect(page.getByRole('heading', { name: 'Apply for Maple' })).toBeVisible();
  await page.locator('#fullName').fill('Taylor Adopter');
  await page.locator('#phone').fill('817-555-010');
  await page.getByRole('button', { name: 'Review application' }).click();
  await expect(page.locator('#phone-hint')).toContainText('exactly 10 digits');

  await page.locator('#phone').fill('817-555-0100');
  await page.locator('#city').fill('Arlington');
  await page.locator('#housingType').selectOption('apartment');
  await page.locator('#homeOwnership').selectOption('rent');
  await page.locator('#petPermission').selectOption('yes');
  await page.locator('#otherPets').fill('None');
  await page.locator('#dailyCare').fill('Daily walks and play.');
  await page.locator('#reason').fill('I can provide a caring home.');
  await page.getByRole('button', { name: 'Review application' }).click();
  await expect(page.getByRole('heading', { name: 'Review your application' })).toBeVisible();
  await page.getByRole('button', { name: 'Submit application' }).click();

  await expect(page.getByRole('heading', { name: 'Your applications' })).toBeVisible();
  await expect(page.getByText('Your application is waiting for the shelter\'s review.')).toBeVisible();
  expect(calls.adoptionApplication).toMatchObject({
    p_animal_id: pets[0].id,
    p_application_data: {
      full_name: 'Taylor Adopter',
      phone: '8175550100',
      city: 'Arlington',
    },
  });
});

test('visit request blocks Sundays and submits a valid reviewed request', async ({ page }) => {
  const calls = await mockSupabase(page, 'adopter');
  await page.goto(`/visit?pet=${pets[0].id}`);

  await expect(page.getByRole('heading', { name: 'Visit Maple' })).toBeVisible();
  await page.locator('#fullName').fill('Taylor Adopter');
  await page.locator('#phone').fill('8175550100');
  await page.locator('#chooseDate').fill(futureDateOnWeekday(0));
  await expect(page.getByText('The shelter is closed on Sundays. Please choose Monday through Saturday.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Review visit request' })).toBeDisabled();

  await page.locator('#chooseDate').fill(futureDateOnWeekday(2));
  await page.locator('#chooseTime').selectOption('14:00');
  await page.locator('#visitNote').fill('Please tell me about Maple’s walking routine.');
  await page.getByRole('button', { name: 'Review visit request' }).click();
  await expect(page.getByRole('heading', { name: 'Review your visit request' })).toBeVisible();
  await page.getByRole('button', { name: 'Send visit request' }).click();

  await expect(page.getByText('Your visit request was sent to the shelter.')).toBeVisible();
  expect(calls.appointmentRequest).toMatchObject({
    p_animal_id: pets[0].id,
    p_contact_details: {
      full_name: 'Taylor Adopter',
      phone: '8175550100',
      note: 'Please tell me about Maple’s walking routine.',
    },
  });
  expect(calls.appointmentRequest?.p_starts_at).toEqual(expect.any(String));
});

test('staff route redirects signed-out users', async ({ page }) => {
  await mockSupabase(page);
  await page.goto('/staff');
  await expect(page).toHaveURL(/\/account\?next=%2Fstaff$/);
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
});

test('staff route blocks unapproved accounts', async ({ page }) => {
  await mockSupabase(page, 'unapproved-staff');
  await page.goto('/staff');
  await expect(page.getByRole('heading', { name: 'Staff access required' })).toBeVisible();
});

test('approved staff can approve a submitted application', async ({ page }) => {
  const calls = await mockSupabase(page, 'staff');
  await page.goto('/staff');

  await expect(page.getByRole('heading', { name: 'Staff dashboard' })).toBeVisible();
  await page.getByRole('button', { name: 'Applications', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Adoption applications' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Maple' })).toBeVisible();

  page.on('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Approve', exact: true }).click();
  await expect(page.getByText('Application approved.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Record completed adoption' })).toBeVisible();
  expect(calls.applicationDecision).toEqual({
    p_application_id: '20000000-0000-4000-8000-000000000001',
    p_decision: 'approved',
  });
});
