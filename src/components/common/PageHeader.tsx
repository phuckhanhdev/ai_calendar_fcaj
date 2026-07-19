import React from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-6 mb-8">
      <div>
        <h2 className="text-xl font-extrabold text-slate-800 m-0 leading-tight">
          {title}
        </h2>
        {description && (
          <p className="text-xs text-slate-400 m-0 mt-1.5 font-semibold">
            {description}
          </p>
        )}
      </div>
      {action && <div className="flex items-center gap-3">{action}</div>}
    </div>
  );
}
