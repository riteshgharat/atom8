"use client";

import { useEffect, useRef } from "react";
import "./atom8-logo.css";

export default function Atom8AnimatedLogo() {
  const ringRef = useRef<SVGPathElement>(null);
  const secondRef = useRef<SVGPathElement>(null);
  const thirdRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const refs = [ringRef.current, secondRef.current, thirdRef.current];

    const triggerAnimation = () => {
      refs.forEach((ref) => {
        if (ref) {
          ref.classList.remove("animate");
          // Force reflow to restart animation
          void ref.getBoundingClientRect();
          ref.classList.add("animate");
        }
      });
    };

    // Initial trigger
    triggerAnimation();

    // Repeat every 12 seconds
    const interval = setInterval(triggerAnimation, 8000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="atom-header-container text-5xl md:text-7xl font-bold tracking-tight text-white">
      <span className="atom-char">A</span>
      <span className="atom-char">T</span>

      <div className="atom-logo-wrapper">
        <svg id="atom-svg" viewBox="0 0 200 300">
          <circle cx="80" cy="135" r="35" className="atom-base" />
          <path
            ref={ringRef}
            className="atom-ring"
            d="M45,145 c-50,-10 -60,-40 10,-35 c95,8 150,50 51,46"
          />
          <path
            ref={secondRef}
            id="atom-ring-2"
            className="atom-ring"
            d="M45,145 c-50,-10 -60,-40 10,-35 c95,8 150,50 51,46"
          />
          <path
            ref={thirdRef}
            id="atom-ring-3"
            className="atom-ring"
            d="M45,145 c-50,-10 -60,-40 10,-35 c95,8 150,50 51,46"
          />
        </svg>
      </div>

      <span className="atom-char">M</span>
      <span className="atom-spacer"></span>
      <span className="atom-char">8</span>
    </div>
  );
}
