"use client";

import { motion } from "framer-motion";

export function ReadingLadder() {
  // Rail endpoints — scala inclinata a sinistra, base verso destra
  const leftX1 = 6,  leftY1 = 0,   leftX2 = 22, leftY2 = 290;
  const rightX1 = 36, rightY1 = 0,  rightX2 = 50, rightY2 = 290;

  // Pioli a intervalli regolari
  const rungYs = [28, 68, 108, 148, 188, 228, 268];

  function rungX(railX1: number, railX2: number, y: number) {
    return railX1 + ((railX2 - railX1) * y) / 290;
  }

  return (
    <motion.div
      initial={{ x: 20 }}
      animate={{ x: 0 }}
      transition={{ duration: 0.8, delay: 1.0, ease: [0.22, 1, 0.36, 1] }}
      className="absolute pointer-events-none"
      style={{
        right: "3%",
        bottom: "10%",
        width: "58px",
        height: "310px",
        zIndex: 12,
      }}
    >
      <svg
        viewBox="0 0 56 310"
        width="100%"
        height="100%"
        style={{ overflow: "visible" }}
      >
        {/* ── Ombre binari ── */}
        <line
          x1={leftX1 + 3} y1={leftY1 + 4}
          x2={leftX2 + 3} y2={leftY2 + 4}
          stroke="rgba(0,0,0,0.45)" strokeWidth="9" strokeLinecap="round"
        />
        <line
          x1={rightX1 + 3} y1={rightY1 + 4}
          x2={rightX2 + 3} y2={rightY2 + 4}
          stroke="rgba(0,0,0,0.45)" strokeWidth="9" strokeLinecap="round"
        />

        {/* ── Binari (rails) ── */}
        <line
          x1={leftX1} y1={leftY1} x2={leftX2} y2={leftY2}
          stroke="#4A2810" strokeWidth="6.5" strokeLinecap="round"
        />
        <line
          x1={rightX1} y1={rightY1} x2={rightX2} y2={rightY2}
          stroke="#4A2810" strokeWidth="6.5" strokeLinecap="round"
        />

        {/* Highlight legno binari */}
        <line
          x1={leftX1 + 1.5} y1={leftY1} x2={leftX2 + 1.5} y2={leftY2}
          stroke="rgba(255,190,80,0.10)" strokeWidth="1.5" strokeLinecap="round"
        />
        <line
          x1={rightX1 + 1.5} y1={rightY1} x2={rightX2 + 1.5} y2={rightY2}
          stroke="rgba(255,190,80,0.10)" strokeWidth="1.5" strokeLinecap="round"
        />

        {/* Venatura legno binari */}
        {[60, 140, 220].map((y, i) => (
          <line
            key={i}
            x1={rungX(leftX1, leftX2, y) + 0.5} y1={y - 12}
            x2={rungX(leftX1, leftX2, y) + 0.5} y2={y + 12}
            stroke="rgba(0,0,0,0.2)" strokeWidth="0.8"
          />
        ))}

        {/* ── Pioli ── */}
        {rungYs.map((y, i) => {
          const x1 = rungX(leftX1, leftX2, y);
          const x2 = rungX(rightX1, rightX2, y);
          return (
            <g key={i}>
              {/* Ombra piolo */}
              <line
                x1={x1 + 1.5} y1={y + 3} x2={x2 + 1.5} y2={y + 3}
                stroke="rgba(0,0,0,0.4)" strokeWidth="5" strokeLinecap="round"
              />
              {/* Piolo */}
              <line
                x1={x1} y1={y} x2={x2} y2={y}
                stroke="#5A3212" strokeWidth="4.5" strokeLinecap="round"
              />
              {/* Highlight superiore piolo */}
              <line
                x1={x1 + 1} y1={y - 1.2} x2={x2 - 1} y2={y - 1.2}
                stroke="rgba(255,200,100,0.13)" strokeWidth="1" strokeLinecap="round"
              />
            </g>
          );
        })}

        {/* Base scala — barra orizzontale */}
        <line
          x1={leftX2 - 2} y1={leftY2} x2={rightX2 + 2} y2={rightY2}
          stroke="#3A2010" strokeWidth="7" strokeLinecap="round"
        />
        <line
          x1={leftX2 - 2} y1={leftY2 - 1} x2={rightX2 + 2} y2={rightY2 - 1}
          stroke="rgba(255,190,80,0.08)" strokeWidth="1.5" strokeLinecap="round"
        />
      </svg>
    </motion.div>
  );
}
