import type { ReactNode } from 'react';

type MessageProps = {
  children: ReactNode;
  kind?: 'info' | 'success' | 'error' | 'loading';
};

export default function Message({ children, kind = 'info' }: MessageProps) {
  return (
    <div
      className={`message message-${kind}`}
      role={kind === 'error' ? 'alert' : 'status'}
    >
      {children}
    </div>
  );
}
