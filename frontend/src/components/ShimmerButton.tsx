"use client";

import "./shimmer-button.css";

type ShimmerButtonProps = {
  text: string;
  onClick?: () => void;
};

export default function ShimmerButton({ text, onClick }: ShimmerButtonProps) {
  return (
    <button className="shimmer-btn" onClick={onClick}>
      <span className="text">{text}</span>
      <span className="shimmer" />
    </button>
  );
}
