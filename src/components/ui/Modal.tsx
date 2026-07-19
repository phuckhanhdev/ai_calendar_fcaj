import React, { useEffect } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  headerBorderColor?: string;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  headerBorderColor
}: ModalProps) {
  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ display: "flex", animation: "fadeIn 0.2s ease-out" }}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside card
        style={{
          borderTop: headerBorderColor ? `6px solid ${headerBorderColor}` : undefined,
          animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
        }}
      >
        <div className="modal-header">
          <h3 className="text-lg font-extrabold text-slate-800 m-0">{title}</h3>
          <button onClick={onClose} className="modal-close-btn" aria-label="Close modal">
            &times;
          </button>
        </div>
        <div className="modal-body" style={{ color: "#000" }}>
          {children}
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
