import "./ui.css";

type MeterProps = {
  percent: number;
  tone?: "accent" | "caution";
  className?: string;
};

function Meter({
  percent,
  tone = "accent",
  className,
}: MeterProps) {
  const width = Math.max(
    0,
    Math.min(100, percent)
  );

  const classes = [
    "ui-meter",
    tone === "caution" ? "ui-meter-caution" : null,
    className ?? null,
  ]
    .filter(Boolean)
    .join(" ");

  // Decorative: every meter sits beside the number it draws, so
  // assistive technology reads the number and skips the bar.
  return (
    <div
      className={classes}
      aria-hidden="true"
    >
      <div
        className="ui-meter-fill"
        style={{
          width: `${width}%`,
        }}
      />
    </div>
  );
}

export default Meter;
