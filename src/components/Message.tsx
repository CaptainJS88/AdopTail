import { AlertCircle, CheckCircle2, Info, LoaderCircle } from 'lucide-react';
import type { ReactNode } from 'react';

type MessageProps = {
  children: ReactNode;
  kind?: 'info' | 'success' | 'error' | 'loading';
};

export default function Message({ children, kind = 'info' }: MessageProps) {
  const Icon =
    kind === 'error'
      ? AlertCircle
      : kind === 'success'
        ? CheckCircle2
        : kind === 'loading'
          ? LoaderCircle
          : Info;

  return (
    <div
      className={`message message-${kind}`}
      role={kind === 'error' ? 'alert' : 'status'}
    >
      <Icon size={18} aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}
