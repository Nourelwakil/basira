/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CSSProperties } from "react";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "rect" | "circle";
  height?: string | number;
  width?: string | number;
}

export default function Skeleton({
  className = "",
  variant = "rect",
  height,
  width,
}: SkeletonProps) {
  const shapeClass =
    variant === "circle"
      ? "rounded-full"
      : variant === "text"
      ? "rounded-md h-4 w-3/4 mb-2"
      : "rounded-lg";

  const style: CSSProperties = {};
  if (height) style.height = typeof height === "number" ? `${height}px` : height;
  if (width) style.width = typeof width === "number" ? `${width}px` : width;

  return (
    <div
      style={style}
      className={`relative overflow-hidden bg-basira-bg-surface border border-basira-border-subtle animate-pulse ${shapeClass} ${className}`}
    >
      {/* Translucent background shimmer overlay */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
    </div>
  );
}
