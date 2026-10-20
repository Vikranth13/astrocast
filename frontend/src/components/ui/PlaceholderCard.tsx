import Card from "./Card";
import EmptyState from "./EmptyState";

type PlaceholderCardProps = {
  title: string;
  message: string;
};

// Marks a feature that has no backend yet. It says when the feature
// arrives instead of showing sample values that could pass for real data.
function PlaceholderCard({
  title,
  message,
}: PlaceholderCardProps) {
  return (
    <Card>
      <div className="ui-stack">
        <span className="ui-eyebrow">
          {title}
        </span>

        <EmptyState message={message} />
      </div>
    </Card>
  );
}

export default PlaceholderCard;
