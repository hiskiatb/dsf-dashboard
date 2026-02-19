export default function Pill({ children, variant = "default" }) {
  const cls =
    variant === "success"
      ? "pill pill-success"
      : variant === "danger"
      ? "pill pill-danger"
      : variant === "info"
      ? "pill pill-info"
      : "pill";

  return <span className={cls}>{children}</span>;
}
