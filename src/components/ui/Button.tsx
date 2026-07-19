import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export default function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  // Base classes for consistent design tokens
  const baseStyle = "inline-flex items-center justify-center font-semibold rounded-xl transition-all cursor-pointer border-none shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  // Design tokens for colors and themes
  const variants = {
    primary: "text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500",
    secondary: "text-slate-700 bg-slate-100 hover:bg-slate-200 focus:ring-slate-400",
    outline: "text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 focus:ring-slate-300",
    danger: "text-white bg-red-600 hover:bg-red-700 focus:ring-red-500",
  };

  // Sizing definitions
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  const combinedClassName = `${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`;

  return (
    <button disabled={disabled || loading} className={combinedClassName} {...props}>
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Đang tải...
        </span>
      ) : (
        children
      )}
    </button>
  );
}
