export const shelter = {
  location: 'Arlington, Texas',
  email: 'hello@adoptail.example',
  phone: '(817) 555-0100',
  hours: [
    { days: 'Monday to Friday', weekdays: [1, 2, 3, 4, 5], open: '10:00', close: '18:00' },
    { days: 'Saturday', weekdays: [6], open: '10:00', close: '16:00' },
    { days: 'Sunday', weekdays: [0], open: '', close: '' },
  ],
};

export function formatTime(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${hours < 12 ? 'AM' : 'PM'}`;
}

export function getVisitingHours(date: string) {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  return shelter.hours.find((hours) => hours.weekdays.includes(day));
}

export function getVisitTimes(date: string) {
  const hours = getVisitingHours(date);
  if (!hours?.open) return [];
  const times: string[] = [];
  const openingHour = Number(hours.open.slice(0, 2));
  const closingHour = Number(hours.close.slice(0, 2));
  for (let minutes = openingHour * 60; minutes <= closingHour * 60 - 30; minutes += 30) {
    times.push(`${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`);
  }
  return times;
}

export function getVisitDate(date: string, time: string) {
  const offset = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    timeZoneName: 'longOffset',
  }).formatToParts(new Date(`${date}T12:00:00Z`))
    .find((part) => part.type === 'timeZoneName')?.value.replace('GMT', '');
  return new Date(`${date}T${time}:00${offset}`);
}

export function getVisitError(date: string, time: string, now = new Date()) {
  const hours = getVisitingHours(date);
  if (!hours) return 'Choose a valid visit date.';
  if (!hours.open) return 'The shelter is closed on Sundays. Please choose Monday through Saturday.';
  if (!getVisitTimes(date).includes(time)) {
    return `Choose a 30-minute visit between ${formatTime(hours.open)} and ${formatTime(hours.close)}. The last visit starts at ${formatTime(getVisitTimes(date).slice(-1)[0])}.`;
  }
  if (getVisitDate(date, time) <= now) return 'This time has already passed. Please choose a later date or time.';
  return '';
}
