import type {
  ReactNode,
} from "react";

import "./ui.css";

type CardProps = {
  children: ReactNode;
  className?: string;
};

function Card({
  children,
  className,
}: CardProps) {
  return (
    <div
      className={
        className
          ? `ui-card ${className}`
          : "ui-card"
      }
    >
      {children}
    </div>
  );
}

export default Card;
