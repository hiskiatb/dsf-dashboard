import { clamp } from "../utils";

export default function Ring({
  title,
  subtitle,
  valueText,
  percent,
  tone = "default",
}) {
  const pctForRing = clamp(percent, 0, 1); // ring tetap max 1
  const pctText = Math.round(percent * 100); // text bisa > 100%

  const size = 145;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * pctForRing;

  const toneClass =
    tone === "success"
      ? "ring-tone-success"
      : tone === "warning"
      ? "ring-tone-warning"
      : tone === "danger"
      ? "ring-tone-danger"
      : "ring-tone-default";

  return (
    <div className={`ring-card ${toneClass}`}>
      <div className="ring-title">{title}</div>
      <div className="ring-subtitle">{subtitle}</div>

      <div className="ring-body">
        <div className="ring-svg">
          <svg width={size} height={size}>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="rgba(0,0,0,0.08)"
              strokeWidth={stroke}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="currentColor"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${c - dash}`}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </svg>

          <div className="ring-center">
            <div className="ring-percent">{pctText}%</div>
            <div className="ring-value">{valueText}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
