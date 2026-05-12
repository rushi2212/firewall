import React from "react";

export default function Card({ children, title, className = "" }) {
  return (
    <section className={`panel p-4 ${className}`}>
      {title && <h3 className="mb-2 text-sm font-bold text-[var(--app-text)]">{title}</h3>}
      <div>{children}</div>
    </section>
  );
}
