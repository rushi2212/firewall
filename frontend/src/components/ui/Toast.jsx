import React from "react";

export function Toast({ children, className = "" }) {
  return (
    <div className={`panel px-4 py-2 text-[var(--app-text)] ${className}`}>
      {children}
    </div>
  );
}

export default Toast;
