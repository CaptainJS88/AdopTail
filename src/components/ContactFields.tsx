import type { ContactDetails } from '../auth/ProfileContext';

export default function ContactFields({ details, email, includeCity = true, formError = '' }: {
  details: ContactDetails;
  email: string;
  includeCity?: boolean;
  formError?: string;
}) {
  const phoneError = formError.startsWith('Phone number:') ? formError.replace('Phone number: ', '') : '';
  return (
    <div className="form-grid">
      <div className="field">
        <label htmlFor="fullName">Full name <span className="required-mark" aria-hidden="true">*</span></label>
        <input id="fullName" name="fullName" autoComplete="name" required maxLength={100} defaultValue={details.fullName} />
      </div>
      <div className="field">
        <label htmlFor="contactEmail">Email</label>
        <input id="contactEmail" name="email" type="email" autoComplete="email" readOnly value={email} />
        <p className="input-hint">Your signed-in account email.</p>
      </div>
      <div className="field">
        <label htmlFor="phone">Phone number <span className="required-mark" aria-hidden="true">*</span></label>
        <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel-national" required maxLength={25} defaultValue={details.phone} aria-describedby="phone-hint" aria-invalid={Boolean(phoneError)} />
        <p className={phoneError ? 'input-error' : 'input-hint'} id="phone-hint">{phoneError || '10 digits, without a country code.'}</p>
      </div>
      {includeCity && (
        <div className="field">
          <label htmlFor="city">City <span className="required-mark" aria-hidden="true">*</span></label>
          <input id="city" name="city" autoComplete="address-level2" required maxLength={80} defaultValue={details.city} />
        </div>
      )}
    </div>
  );
}
