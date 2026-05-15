import React from "react";

const Loader = ({ size = "md", text = "Loading..." }) => {
  const sizeClasses = {
    sm: "h-6 w-6 border-2",
    md: "h-12 w-12 border-4",
    lg: "h-16 w-16 border-4",
  };

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div
        className={`animate-spin rounded-full border-[var(--app-primary)] border-t-transparent ${sizeClasses[size]}`}
      ></div>
      {text && <p className="mt-4 text-sm font-medium text-[var(--app-text-muted)]">{text}</p>}
    </div>
  );
};

export default Loader;
