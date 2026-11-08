import { useEffect, useRef } from 'react';

export default function FormReview({ title, items, onEdit, onConfirm, confirmLabel = 'Confirm', busy = false }: {
  title: string;
  items: { label: string; value: string }[];
  onEdit: () => void;
  onConfirm?: () => void;
  confirmLabel?: string;
  busy?: boolean;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  return (
    <section className="form-review" aria-labelledby="review-title">
      <h2 id="review-title" tabIndex={-1} ref={heading}>{title}</h2>
      <dl className="review-details">
        {items.map((item) => (
          <div key={item.label}><dt>{item.label}</dt><dd>{item.value || 'Not provided'}</dd></div>
        ))}
      </dl>
      <div className="form-actions">
        <button className="button button-secondary" type="button" onClick={onEdit} disabled={busy}>Edit details</button>
        {onConfirm && <button className="button" type="button" onClick={onConfirm} disabled={busy}>{busy ? 'Submitting…' : confirmLabel}</button>}
      </div>
    </section>
  );
}
