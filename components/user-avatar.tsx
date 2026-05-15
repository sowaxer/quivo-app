'use client';

import { useUser } from '@clerk/nextjs';
import { getUserAvatarUrl, getUserInitials } from '@/lib/user-display';

type Props = {
  size?: number;
  className?: string;
};

export function UserAvatar({ size = 36, className = '' }: Props) {
  const { user, isLoaded } = useUser();
  const px = `${size}px`;
  const initials = getUserInitials(user);
  const src = getUserAvatarUrl(user);

  if (!isLoaded) {
    return (
      <span
        className={`inline-block shrink-0 animate-pulse rounded-full bg-[var(--bg-hover)] ${className}`}
        style={{ width: px, height: px }}
        aria-hidden
      />
    );
  }

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={user?.fullName ?? 'Profile'}
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        className={`shrink-0 rounded-full object-cover ring-1 ring-[var(--bg-border)] ${className}`}
        style={{ width: px, height: px }}
      />
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 text-[11px] font-semibold text-white ring-1 ring-[var(--bg-border)] ${className}`}
      style={{ width: px, height: px }}
      aria-hidden
    >
      {initials}
    </span>
  );
}
