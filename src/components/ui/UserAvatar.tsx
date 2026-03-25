"use client";

import { useState, useCallback } from "react";

interface UserAvatarProps {
  name: string;
  pictureUrl?: string | null;
  size?: "sm" | "md" | "lg";
}

const SIZE_MAP: Record<"sm" | "md" | "lg", { container: string; text: string }> = {
  sm: { container: "w-8 h-8", text: "text-xs" },
  md: { container: "w-10 h-10", text: "text-sm" },
  lg: { container: "w-14 h-14", text: "text-xl" },
};

function getInitials(name: string): string {
  return name.slice(0, 1);
}

export default function UserAvatar({ name, pictureUrl, size = "md" }: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const sizeConfig = SIZE_MAP[size];

  const handleError = useCallback(() => {
    setImgError(true);
  }, []);

  if (pictureUrl && !imgError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- 外部URL画像(LINEプロフィール)のためnext/image不使用
      <img
        src={pictureUrl}
        alt={`${name}のプロフィール画像`}
        onError={handleError}
        className={`${sizeConfig.container} rounded-full object-cover flex-shrink-0`}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div
      className={`${sizeConfig.container} bg-gray-100 flex items-center justify-center rounded-full flex-shrink-0`}
    >
      <span className={`${sizeConfig.text} font-medium text-gray-600`}>
        {getInitials(name)}
      </span>
    </div>
  );
}
