import React from "react";

export default function Button({ children, onClick, className = "", type = "button", variant = "primary", ...props }) {
  const variants = {
    primary: "btn-primary",
    secondary: "btn-secondary",
    danger: "bg-rose-600 text-white hover:bg-rose-700",
  };
  const cls = `btn ${variants[variant] || variants.primary} ${className}`;
  return (
    <button type={type} onClick={onClick} className={cls} {...props}>
      {children}
    </button>
  );
}
