import { useEffect, useRef } from 'react';

export default function FormReview({ title, items, onEdit }: {
  title: string;
  items: { label: string; value: string }[];
  onEdit: () => void;
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
      <button className="button button-secondary" type="button" onClick={onEdit}>Edit details</button>
    </section>
  );
}
