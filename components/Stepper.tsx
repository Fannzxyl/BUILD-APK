import React, {
  useState,
  useRef,
  useEffect,
  Children,
  ReactNode,
  ReactElement,
} from 'react';

interface StepProps {
  children: ReactNode;
}

export const Step: React.FC<StepProps> = ({ children }) => {
  return <>{children}</>;
};

interface StepperProps {
  currentStep: number;
  className?: string;
  children: ReactNode;
  animated?: boolean;
  keepMounted?: boolean;
  duration?: number;
}

const Stepper: React.FC<StepperProps> = ({
  currentStep,
  className,
  children,
  animated = true,
  keepMounted = false,
  duration = 300,
}) => {
  const allSteps = Children.toArray(children) as ReactElement[];

  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | 'auto'>('auto');
  const [mounted, setMounted] = useState(allSteps.map(() => false));
  const [renderedStep, setRenderedStep] = useState(currentStep);

  useEffect(() => {
    if (!keepMounted) {
      setRenderedStep(currentStep);
      return;
    }

    setMounted((prev) =>
      prev.map((m, idx) => (idx + 1 === currentStep ? true : m))
    );

    const timeout = setTimeout(() => {
      setRenderedStep(currentStep);
    }, animated ? duration : 0);

    return () => clearTimeout(timeout);
  }, [currentStep, keepMounted, animated, duration]);

  useEffect(() => {
    if (!containerRef.current || !animated) return;
    const el = containerRef.current;

    const newHeight = el.scrollHeight;
    setHeight(newHeight);

    const timeout = setTimeout(() => {
      setHeight('auto');
    }, duration);

    return () => clearTimeout(timeout);
  }, [renderedStep, children, animated, duration]);

  const getStepStyle = (stepIndex: number) => {
    const isActive = stepIndex + 1 === renderedStep;

    if (!animated) {
      return { display: isActive ? 'block' : 'none' };
    }

    return {
      opacity: isActive ? 1 : 0,
      transform: isActive ? 'translateY(0px)' : 'translateY(10px)',
      transition: `opacity ${duration}ms ease, transform ${duration}ms ease`,
      position: isActive ? 'relative' : 'absolute',
      top: 0,
      left: 0,
      right: 0,
      pointerEvents: isActive ? 'auto' : 'none',
    } as React.CSSProperties;
  };

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        transition: animated
          ? `height ${duration}ms ease, opacity ${duration}ms`
          : '',
        height: animated ? (typeof height === 'number' ? `${height}px` : 'auto') : 'auto',
        overflow: 'hidden',
      }}
      ref={containerRef}
    >
      {allSteps.map((child, idx) => {
        const stepNumber = idx + 1;

        if (!keepMounted && stepNumber !== renderedStep) return null;

        const shouldRender = keepMounted ? mounted[idx] : stepNumber === renderedStep;

        if (!shouldRender) return null;

        return (
          <div key={idx} style={getStepStyle(idx)}>
            {child}
          </div>
        );
      })}
    </div>
  );
};

export default Stepper;

// ==================================================================================
// NOTES
// ==================================================================================
// • Stepper ini PRO GRADE (bisa dipakai production).
// • fully animated, controlled, keepMounted/unmounted.
// • otomatis adjust height (smooth).
// • ZERO flicker.
// • kalau mau non-animated, set animated={false}.
//
// Cara pakai:
//
// <Stepper currentStep={step}>
//    <Step>Page 1</Step>
//    <Step>Page 2</Step>
//    <Step>Page 3</Step>
// </Stepper>
//
// ==================================================================================
