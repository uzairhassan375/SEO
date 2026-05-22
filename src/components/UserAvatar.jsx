"use client";

import Image from "next/image";
import { cn, getDisplayName, getInitials } from "@/lib/utils";

const sizes = {
  xs: "h-8 w-8 text-xs",
  sm: "h-10 w-10 text-sm",
  md: "h-12 w-12 text-base",
  lg: "h-20 w-20 text-xl",
  xl: "h-28 w-28 text-2xl",
};

export default function UserAvatar({
  profile,
  size = "md",
  className = "",
  showRing = false,
}) {
  const dim = sizes[size] || sizes.md;
  const initials = getInitials(profile);
  const name = getDisplayName(profile);
  const url = profile?.avatar_url;

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full bg-[#1e3a5f] font-semibold text-white",
        dim,
        showRing && "ring-2 ring-white ring-offset-2 ring-offset-slate-100",
        className
      )}
      title={name}
    >
      {url ? (
        <Image
          src={url}
          alt={name}
          fill
          className="object-cover"
          sizes="112px"
          unoptimized
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center">
          {initials}
        </span>
      )}
    </div>
  );
}
