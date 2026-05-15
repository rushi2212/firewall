import React from "react";

export default function Spinner({ size = 24, className = "" }) {
  const s = typeof size === "number" ? `${size}px` : size;
  return (
    <svg
      className={`animate-spin text-blue-600 ${className}`}
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.2" />
      <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
