import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}

export default function Card({
  children,
  title,
  subtitle,
  icon,
  actions,
  className = "",
  ...props
}: CardProps) {
  return (
    <div
      className={`bg-white border border-slate-150 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 ${className}`}
      {...props}
    >
      {(title || subtitle || icon || actions) && (
        <div className="flex justify-between items-start border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center gap-3">
            {icon && <span className="text-xl">{icon}</span>}
            <div>
              {title && <h3 className="text-base font-extrabold text-slate-800 m-0">{title}</h3>}
              {subtitle && <p className="text-xs text-slate-400 m-0 font-medium">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="text-sm text-slate-600 leading-relaxed">{children}</div>
    </div>
  );
}
