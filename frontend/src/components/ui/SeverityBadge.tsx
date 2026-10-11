import type {
  Tone,
} from "./severity";

import "./ui.css";

type SeverityBadgeProps = {
  label: string;
  tone?: Tone;
};

function SeverityBadge({
  label,
  tone = "quiet",
}: SeverityBadgeProps) {
  const className =
    tone === "quiet"
      ? "ui-badge"
      : `ui-badge ui-badge-${tone}`;

  return (
    <span className={className}>
      {label}
    </span>
  );
}

export default SeverityBadge;
