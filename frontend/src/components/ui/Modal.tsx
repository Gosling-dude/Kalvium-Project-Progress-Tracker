import { ReactNode, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./Icon";

// Every overlay is portalled to <body> rather than rendered where it is used.
// Left in place it lands inside `main` (a scroll container) and inside
// PageContainer's `.page-enter`, whose fade-in-up animation keeps an animated
// opacity/transform on the element: that combination establishes a backdrop
// root and a composited clip smaller than the viewport, so `backdrop-blur`
// below only composited against part of the screen and the rest painted blank
// white — and `position: fixed` resolved against the page container instead of
// the viewport. At body level there is no such ancestor.
function OverlayPortal({ children }: { children: ReactNode }) {
  return createPortal(children, document.body);
}

// Escape-to-close plus a body scroll lock, shared by Modal and Drawer. Both
// previously left the page scrollable behind the overlay, which made a long
// form feel like it was floating over a moving background.
//
// onClose is read through a ref so the effect keys only off `open`: every caller
// passes an inline arrow, which would otherwise re-run this on every render and
// thrash body.style.overflow.
function useOverlayBehavior(open: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCloseRef.current();
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      className="-mr-1 flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 active:bg-slate-200 dark:hover:bg-slate-800 dark:hover:text-slate-200 dark:active:bg-slate-700"
      aria-label="Close"
    >
      <Icon name="close" size={16} />
    </button>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  width = "max-w-lg",
  description,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: string;
  description?: string;
}) {
  useOverlayBehavior(open, onClose);
  if (!open) return null;
  return (
    <OverlayPortal>
      <div
        className="fixed inset-0 z-50 flex animate-fade-in items-start justify-center overflow-y-auto bg-slate-900/50 p-4 pt-10 backdrop-blur-sm sm:pt-16"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => {
          // Click-outside to dismiss, but only when the press starts on the
          // backdrop itself — never on a drag that ends there.
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          className={`w-full animate-scale-in rounded-xl bg-white shadow-pop ring-1 ring-slate-900/5 dark:bg-slate-900 dark:ring-white/10 ${width}`}
        >
          <div className="surface-header flex items-start justify-between gap-3 rounded-t-xl border-b border-slate-200/80 px-4 py-3 dark:border-slate-800">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
              {description && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{description}</p>}
            </div>
            <CloseButton onClose={onClose} />
          </div>
          <div className="scroll-soft max-h-[75vh] overflow-y-auto px-4 py-4">{children}</div>
        </div>
      </div>
    </OverlayPortal>
  );
}

export function Drawer({
  open,
  onClose,
  title,
  children,
  width = "max-w-xl",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: string;
}) {
  useOverlayBehavior(open, onClose);
  if (!open) return null;
  return (
    <OverlayPortal>
      <div
        className="fixed inset-0 z-50 flex animate-fade-in justify-end bg-slate-900/50 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          className={`scroll-soft h-full w-full animate-slide-in-right overflow-y-auto bg-white shadow-pop dark:bg-slate-900 ${width}`}
        >
          <div className="surface-header sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-200/80 px-4 py-3 backdrop-blur dark:border-slate-800">
            <h2 className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
            <CloseButton onClose={onClose} />
          </div>
          <div className="px-4 py-4">{children}</div>
        </div>
      </div>
    </OverlayPortal>
  );
}
