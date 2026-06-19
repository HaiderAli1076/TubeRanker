import { useState, useEffect } from "react";

function easeOutQuad(t: number) {
  return t * (2 - t);
}

export function useCountUp(endValue: number, duration: number = 600, triggerKey?: any) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    const startValue = 0;

    // Reset the count to 0 immediately when dependencies change
    setCount(0);

    if (endValue === 0) {
      return;
    }

    let animationFrameId: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easedProgress = easeOutQuad(progress);
      setCount(Math.round(startValue + (endValue - startValue) * easedProgress));

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [endValue, duration, triggerKey]);

  return count;
}
