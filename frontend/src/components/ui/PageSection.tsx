import {
  useId,
  type ReactNode,
} from "react";

import SectionHeader from "./SectionHeader";

import "./ui.css";

type PageSectionProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
};

function PageSection({
  title,
  description,
  action,
  children,
}: PageSectionProps) {
  const titleId = useId();

  return (
    <section
      className="page-section"
      aria-labelledby={titleId}
    >
      <SectionHeader
        title={title}
        description={description}
        action={action}
        titleId={titleId}
      />

      {children}
    </section>
  );
}

export default PageSection;
