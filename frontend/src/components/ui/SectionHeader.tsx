import type {
  ReactNode,
} from "react";

import "./ui.css";

type SectionHeaderProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  titleId?: string;
};

function SectionHeader({
  title,
  description,
  action,
  titleId,
}: SectionHeaderProps) {
  return (
    <div className="ui-section-header">
      <div>
        <h2 id={titleId}>{title}</h2>

        {description && (
          <p className="ui-section-header-description">
            {description}
          </p>
        )}
      </div>

      {action}
    </div>
  );
}

export default SectionHeader;
