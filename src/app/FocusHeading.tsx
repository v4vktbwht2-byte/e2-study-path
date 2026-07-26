import { useEffect, useRef, type HTMLAttributes, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

interface FocusHeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  readonly children: ReactNode;
}

export function FocusHeading({
  children,
  className,
  ...headingProps
}: FocusHeadingProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    const heading = headingRef.current;
    if (!heading) {
      return;
    }

    const scrollContainer = heading.closest<HTMLElement>("main");
    if (scrollContainer) {
      scrollContainer.scrollTop = 0;
      scrollContainer.scrollLeft = 0;
    }
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    heading.focus({ preventScroll: true });
  }, [pathname]);

  return (
    <h1 {...headingProps} ref={headingRef} className={className} tabIndex={-1}>
      {children}
    </h1>
  );
}
