import { useEffect, useRef, type ReactNode } from "react";
import { X, ArrowLeft, BookOpen, LoaderCircle } from "lucide-react";
import { useApp } from "../store";
export function Modal({
  children,
  onClose,
  label,
  wide = false,
  className = "",
  fullScreen = false,
}: {
  children: ReactNode;
  onClose?: () => void;
  label: string;
  wide?: boolean;
  className?: string;
  fullScreen?: boolean;
}) {
  const { t } = useApp();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    const bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      d?.close();
      document.body.style.overflow = bodyOverflow;
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "wide" : ""} ${className}`}
      aria-label={label}
      onCancel={(e) => {
        e.preventDefault();
        onClose?.();
      }}
    >
      <div className="modal-top">
        {fullScreen && onClose && (
          <button className="icon-button reader-screen-back" aria-label={t("backToList")} onClick={onClose}>
            <ArrowLeft />
          </button>
        )}
        <h2>{label}</h2>
        {onClose && !fullScreen && (
          <button className="icon-button" aria-label="Close" onClick={onClose}>
            <X />
          </button>
        )}
      </div>
      {children}
    </dialog>
  );
}
export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled = false,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <label className="toggle-row">
      <span>
        <strong>{label}</strong>
        {description && <small>{description}</small>}
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
    </label>
  );
}
export function Empty({
  title,
  body,
  children,
}: {
  title?: string;
  body?: string;
  children?: ReactNode;
}) {
  const { t } = useApp();
  return (
    <div className="empty">
      <div className="empty-icon">
        <BookOpen />
      </div>
      <h3>{title || t("emptyContent")}</h3>
      <p>{body || t("emptyHelp")}</p>
      {children}
    </div>
  );
}
export function Spinner() {
  return <LoaderCircle className="spin" aria-label="Loading" />;
}
export function Banner({
  children,
  kind = "info",
}: {
  children: ReactNode;
  kind?: "info" | "error" | "success";
}) {
  return (
    <div
      className={`banner ${kind}`}
      role={kind === "error" ? "alert" : "status"}
    >
      {children}
    </div>
  );
}
