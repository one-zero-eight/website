import { useEffect, useState } from "react";

const AnimatedDots = () => {
  const [dotCount, setDotCount] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount((prev) => (prev === 3 ? 1 : prev + 1));
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return <span className="w-[20px]">{".".repeat(dotCount)}</span>;
};

export default AnimatedDots;
