import "./observe.css";

type ScoreReadoutProps = {
  score: number | null;
  rating?: string;
};

const MISSING_SCORE = "—";

function ScoreReadout({
  score,
  rating,
}: ScoreReadoutProps) {
  return (
    <div className="score-readout">
      <span
        className={
          score === null
            ? "score-readout-value score-readout-empty"
            : "score-readout-value"
        }
      >
        {score ?? MISSING_SCORE}
      </span>

      <span className="score-readout-total">
        / 100
      </span>

      {rating && (
        <span className="ui-headline">
          {rating}
        </span>
      )}
    </div>
  );
}

export default ScoreReadout;
