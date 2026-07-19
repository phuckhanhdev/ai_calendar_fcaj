import React from "react";

interface FeatureContainerProps {
  children: React.ReactNode;
  className?: string;
}

export default function FeatureContainer({ children, className = "" }: FeatureContainerProps) {
  return (
    <div className={`bg-white border border-slate-200 rounded-3xl p-8 shadow-sm ${className}`}>
      {children}
    </div>
  );
}
