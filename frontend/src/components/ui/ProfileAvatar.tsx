import { useState } from "react";
import { getProfileInitials } from "../../domain/profile";
import "./ProfileAvatar.css";

export default function ProfileAvatar({ displayName, avatarUrl, className }: {
  displayName: string | null; avatarUrl?: string | null; className: string;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  return <span className={className} role="img" aria-label={displayName ? `Ảnh đại diện của ${displayName}` : "Ảnh đại diện mặc định"}>
    {avatarUrl && failedUrl !== avatarUrl ? <img className="profile-avatar__image" src={avatarUrl} alt="" onError={() => setFailedUrl(avatarUrl)} /> : getProfileInitials(displayName) || "…"}
  </span>;
}
