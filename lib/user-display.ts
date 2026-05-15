type ClerkUserLike = {
  fullName?: string | null;
  firstName?: string | null;
  hasImage?: boolean;
  imageUrl?: string;
  primaryEmailAddress?: { emailAddress: string } | null;
};

export function getUserDisplayName(user: ClerkUserLike | null | undefined): string {
  if (!user) return 'Guest';
  const full = user.fullName?.trim();
  if (full) return full;
  const first = user.firstName?.trim();
  if (first) return first;
  const email = user.primaryEmailAddress?.emailAddress;
  if (email) return email.split('@')[0] ?? email;
  return 'Account';
}

export function getUserAvatarUrl(user: ClerkUserLike | null | undefined): string | null {
  if (!user) return null;
  if (user.hasImage && user.imageUrl) return user.imageUrl;
  return null;
}

export function getUserInitials(user: ClerkUserLike | null | undefined): string {
  const name = getUserDisplayName(user);
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return (name[0] ?? 'Q').toUpperCase();
}
