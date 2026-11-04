export function avatarUrl(user: { avatar?: { revision: string } | null }) {
  return user.avatar ? "/api/v1/users/me/avatar?v=" + user.avatar.revision : null;
}
