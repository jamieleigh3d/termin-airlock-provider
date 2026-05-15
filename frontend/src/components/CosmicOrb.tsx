// Copyright 2026 Jamie-Leigh Blake and Termin project contributors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.

// CosmicOrb — the visual scene for the Airlock inciting-incident view.
//
// Pure aesthetic geometry: an orbital-station airlock door viewport
// looking out at a planet against deep space, with structural panels,
// warning-light strips, hazard stripes, and a subtle drift animation
// on the planet+stars layer behind the door.
//
// Slice A2 PoC scope: ships as a fixed visual asset — no props, no
// runtime parameterization. The .termin source for the v0.9.4 sample
// app composes this component with `airlock.scenario-narrative` (text
// overlay) on the same page. A future slice may parameterize the
// warning state (red glow on/off) or planet variant when there's a
// concrete .termin source need; for now the asset is fixed.
//
// Why no IR fragment props consumed: the orb is a single instance per
// page (the inciting-incident scene). The .termin source binds it via
// `Using "airlock.cosmic-orb"` and the runtime hands the renderer an
// IR fragment, but the fragment carries no payload this component
// needs — the SVG is the asset.

import React, { useMemo } from "react";

/** Deterministic LCG star field — stable across re-renders (matches
 *  the existing Airlock visual seed so the scene reproduces the same
 *  stars every paint). Computed once via useMemo per mount. */
function generateStars(): Array<{ x: number; y: number; r: number; o: number }> {
  const arr: Array<{ x: number; y: number; r: number; o: number }> = [];
  let s = 0x7e3a9f12 >>> 0;
  const rand = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
  for (let i = 0; i < 80; i++) {
    arr.push({
      x: rand() * 1440,
      y: rand() * 900,
      r: rand() * 1.8 + 0.2,
      o: rand() * 0.65 + 0.25,
    });
  }
  return arr;
}

/** Bolt positions around the hatch mounting ring (8 bolts at 45° intervals). */
function generateHatchBolts(): Array<{ x: number; y: number }> {
  return Array.from({ length: 8 }, (_, i) => {
    const rad = (i * 45 * Math.PI) / 180;
    return { x: 720 + 211 * Math.cos(rad), y: 240 + 211 * Math.sin(rad) };
  });
}

export interface CosmicOrbProps {
  /** Optional className override for the outer wrapper — useful when
   *  the .termin source positions the orb relative to other contracts.
   *  Defaults to a full-viewport block. */
  className?: string;
}

export const CosmicOrb: React.FC<CosmicOrbProps> = ({
  // v0.9.4: dropped the default `absolute inset-0` because it was
  // overlaying the page's SSR nav bar — players landed on /landing
  // and had no way to see / click the navigation. The new default
  // is a viewport-height block in normal document flow: still
  // visually dominant on Landing, but sits BELOW any chrome the
  // page renders above it. Pages that genuinely want the orb
  // full-bleed (no chrome) can pass an absolute-inset className
  // explicitly.
  className = "block w-full h-screen pointer-events-none",
}) => {
  const stars = useMemo(generateStars, []);
  const hatchBolts = useMemo(generateHatchBolts, []);

  return (
    <svg
      className={className}
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Orbital airlock viewport looking onto a planet"
      data-airlock-component="cosmic-orb"
    >
      <defs>
        {/* Deep space fill */}
        <radialGradient id="airlock-co-space" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#06101e" />
          <stop offset="100%" stopColor="#020509" />
        </radialGradient>

        {/* Planet ocean gradient */}
        <radialGradient id="airlock-co-planet" cx="38%" cy="32%" r="60%">
          <stop offset="0%" stopColor="#7ecfff" />
          <stop offset="18%" stopColor="#3a8fd4" />
          <stop offset="50%" stopColor="#1a5fa8" />
          <stop offset="75%" stopColor="#0d3870" />
          <stop offset="92%" stopColor="#071c40" />
          <stop offset="100%" stopColor="#020c1c" />
        </radialGradient>

        {/* Planet atmosphere rim glow */}
        <radialGradient id="airlock-co-atmo" cx="50%" cy="50%" r="50%">
          <stop offset="70%" stopColor="rgba(60,140,255,0)" />
          <stop offset="87%" stopColor="rgba(60,140,255,0.16)" />
          <stop offset="100%" stopColor="rgba(60,140,255,0)" />
        </radialGradient>

        {/* Bulkhead wall gradients — left, right, top, floor */}
        <linearGradient id="airlock-co-left-wall" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#0d1520" stopOpacity="1" />
          <stop offset="72%" stopColor="#0d1520" stopOpacity="0.98" />
          <stop offset="88%" stopColor="#0d1520" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#0d1520" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="airlock-co-right-wall" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#0d1520" stopOpacity="0" />
          <stop offset="12%" stopColor="#0d1520" stopOpacity="0.6" />
          <stop offset="28%" stopColor="#0d1520" stopOpacity="0.98" />
          <stop offset="100%" stopColor="#0d1520" stopOpacity="1" />
        </linearGradient>
        <linearGradient id="airlock-co-top-panel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a1018" stopOpacity="1" />
          <stop offset="100%" stopColor="#0a1018" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="airlock-co-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#030710" stopOpacity="0" />
          <stop offset="60%" stopColor="#030710" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#030710" stopOpacity="1" />
        </linearGradient>

        {/* Emergency red glow from top corners */}
        <radialGradient id="airlock-co-red-left" cx="0%" cy="0%" r="55%">
          <stop offset="0%" stopColor="rgba(210,25,25,0.38)" />
          <stop offset="100%" stopColor="rgba(210,25,25,0)" />
        </radialGradient>
        <radialGradient id="airlock-co-red-right" cx="100%" cy="0%" r="55%">
          <stop offset="0%" stopColor="rgba(210,25,25,0.38)" />
          <stop offset="100%" stopColor="rgba(210,25,25,0)" />
        </radialGradient>

        {/* Door viewport circular clip */}
        <clipPath id="airlock-co-door-clip">
          <circle cx="720" cy="240" r="199" />
        </clipPath>

        {/* Planet circular clip — for landmasses + clouds */}
        <clipPath id="airlock-co-planet-clip">
          <circle cx="575" cy="305" r="193" />
        </clipPath>
      </defs>

      {/* Deep space base */}
      <rect width="1440" height="900" fill="#010306" />

      {/* Door viewport interior */}
      <circle cx="720" cy="240" r="200" fill="url(#airlock-co-space)" />

      {/* Viewport contents — stars + planet, drift animation, clipped to door */}
      <g clipPath="url(#airlock-co-door-clip)">
        <g>
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0 0; 2 -1; 0.5 1.5; -1 0.5; 0 0"
            keyTimes="0; 0.25; 0.5; 0.75; 1"
            dur="22s"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95"
          />

          {stars.map((s, i) => (
            <circle
              key={`s-${i}`}
              cx={s.x}
              cy={s.y}
              r={s.r}
              fill="white"
              opacity={s.o}
            />
          ))}

          {/* Planet ocean body */}
          <circle cx="575" cy="305" r="195" fill="url(#airlock-co-planet)" />

          {/* Planet features clipped to planet circle */}
          <g clipPath="url(#airlock-co-planet-clip)">
            {/* Polar ice cap */}
            <ellipse cx="575" cy="116" rx="62" ry="20" fill="rgba(215,232,252,0.90)" />
            <ellipse cx="575" cy="123" rx="74" ry="26" fill="rgba(215,232,252,0.32)" />

            {/* Continents */}
            <ellipse cx="628" cy="183" rx="38" ry="55" fill="rgba(68,92,45,0.78)"
              transform="rotate(-18 628 183)" />
            <ellipse cx="650" cy="220" rx="22" ry="32" fill="rgba(76,100,50,0.72)"
              transform="rotate(-24 650 220)" />
            <ellipse cx="616" cy="308" rx="30" ry="44" fill="rgba(65,85,42,0.70)"
              transform="rotate(12 616 308)" />

            {/* Island chain */}
            <ellipse cx="590" cy="252" rx="14" ry="8" fill="rgba(72,94,48,0.65)"
              transform="rotate(-30 590 252)" />
            <ellipse cx="606" cy="264" rx="10" ry="7" fill="rgba(68,90,45,0.60)"
              transform="rotate(-22 606 264)" />

            {/* Cloud wisps */}
            <ellipse cx="662" cy="150" rx="44" ry="11" fill="rgba(235,245,255,0.22)"
              transform="rotate(-8 662 150)" />
            <ellipse cx="608" cy="358" rx="36" ry="9" fill="rgba(235,245,255,0.18)"
              transform="rotate(5 608 358)" />
            <ellipse cx="638" cy="276" rx="26" ry="7" fill="rgba(235,245,255,0.15)"
              transform="rotate(-15 638 276)" />
          </g>

          {/* Atmosphere rim */}
          <circle cx="575" cy="305" r="218" fill="url(#airlock-co-atmo)" />
        </g>
      </g>

      {/* Bulkhead walls */}
      <rect x="0" y="0" width="600" height="900" fill="url(#airlock-co-left-wall)" />
      <rect x="840" y="0" width="600" height="900" fill="url(#airlock-co-right-wall)" />
      <rect x="0" y="0" width="1440" height="145" fill="url(#airlock-co-top-panel)" />
      <rect x="0" y="440" width="1440" height="460" fill="url(#airlock-co-floor)" />
      <rect x="0" y="830" width="1440" height="70" fill="#02060e" />

      {/* Structural panel seams */}
      <line x1="0" y1="138" x2="508" y2="138" stroke="#18273a" strokeWidth="1.5" />
      <line x1="0" y1="448" x2="508" y2="448" stroke="#18273a" strokeWidth="1.5" />
      <line x1="0" y1="625" x2="1440" y2="625" stroke="#18273a" strokeWidth="1.5" />
      <line x1="932" y1="138" x2="1440" y2="138" stroke="#18273a" strokeWidth="1.5" />
      <line x1="932" y1="448" x2="1440" y2="448" stroke="#18273a" strokeWidth="1.5" />
      <line x1="382" y1="0" x2="382" y2="900" stroke="#18273a" strokeWidth="1.5" />
      <line x1="1058" y1="0" x2="1058" y2="900" stroke="#18273a" strokeWidth="1.5" />

      {/* Bolts at main seam intersections */}
      {([
        [382, 138], [382, 448], [382, 625],
        [1058, 138], [1058, 448], [1058, 625],
      ] as [number, number][]).map(([cx, cy], i) => (
        <circle key={`bm-${i}`} cx={cx} cy={cy} r="3.5"
          fill="#1c2d40" stroke="#263548" strokeWidth="0.8" />
      ))}

      {/* Intermediate bolts along top seam */}
      {[180, 282].map((x, i) => (
        <circle key={`bt-${i}`} cx={x} cy={138} r="2.5"
          fill="#192436" stroke="#21304a" strokeWidth="0.7" />
      ))}
      {[1158, 1260].map((x, i) => (
        <circle key={`btr-${i}`} cx={x} cy={138} r="2.5"
          fill="#192436" stroke="#21304a" strokeWidth="0.7" />
      ))}

      {/* Conduit pipes along top */}
      <rect x="22" y="52" width="342" height="8" rx="4" fill="#12202e"
        stroke="#1a2d3e" strokeWidth="0.8" />
      <rect x="1076" y="52" width="342" height="8" rx="4" fill="#12202e"
        stroke="#1a2d3e" strokeWidth="0.8" />
      <circle cx="364" cy="56" r="5.5" fill="#192838" stroke="#22374d" strokeWidth="0.8" />
      <circle cx="1076" cy="56" r="5.5" fill="#192838" stroke="#22374d" strokeWidth="0.8" />
      {[100, 200].map((x, i) => (
        <rect key={`cp-${i}`} x={x} y="49" width="6" height="14" rx="1"
          fill="#0e1c28" stroke="#1a2d3e" strokeWidth="0.6" />
      ))}
      {[1240, 1340].map((x, i) => (
        <rect key={`cpr-${i}`} x={x} y="49" width="6" height="14" rx="1"
          fill="#0e1c28" stroke="#1a2d3e" strokeWidth="0.6" />
      ))}

      {/* Equipment box — left wall */}
      <rect x="28" y="275" width="78" height="98" rx="2"
        fill="#0c1820" stroke="#192a3a" strokeWidth="1" />
      <rect x="28" y="275" width="78" height="14" rx="2" fill="#121e2c" />
      <circle cx="44" cy="308" r="4.5" fill="#0e280e" stroke="#0a1e0a" strokeWidth="0.5" />
      <circle cx="58" cy="308" r="4.5" fill="#0e280e" stroke="#0a1e0a" strokeWidth="0.5" />
      <circle cx="72" cy="308" r="4.5" fill="rgba(195,22,22,0.72)" stroke="#7a0000" strokeWidth="0.5" />
      {[326, 334, 342, 350].map((y, i) => (
        <rect key={`vs-${i}`} x="36" y={y} width="54" height="2.5" rx="1" fill="#080f18" />
      ))}
      <rect x="38" y="381" width="58" height="5" rx="1.5"
        fill="#142030" stroke="#1c2d40" strokeWidth="0.8" />

      {/* Right wall panel */}
      <rect x="1330" y="280" width="55" height="72" rx="2"
        fill="#0c1820" stroke="#192a3a" strokeWidth="1" />
      <rect x="1330" y="280" width="55" height="11" rx="2" fill="#121e2c" />
      <circle cx="1346" cy="311" r="3.5" fill="rgba(195,22,22,0.65)" stroke="#7a0000" strokeWidth="0.5" />
      <circle cx="1358" cy="311" r="3.5" fill="#0e280e" stroke="#0a1e0a" strokeWidth="0.5" />

      {/* Outer hatch door frame */}
      <circle cx="720" cy="240" r="225" fill="none" stroke="#0a131e" strokeWidth="5" />
      <circle cx="720" cy="240" r="200" fill="none" stroke="#131d2c" strokeWidth="24" />
      <circle cx="720" cy="240" r="212" fill="none" stroke="#0c1520" strokeWidth="8" />
      <circle cx="720" cy="240" r="187" fill="none" stroke="#1a2740"
        strokeWidth="2.5" strokeDasharray="7 5" />

      {/* Hatch mounting ring bolts */}
      {hatchBolts.map((b, i) => (
        <circle key={`hb-${i}`} cx={b.x} cy={b.y} r="4.5"
          fill="#1c2e42" stroke="#253c56" strokeWidth="0.8" />
      ))}

      {/* Structural cross-bars on door */}
      <rect x="519" y="234" width="402" height="11" fill="#131d2c" />
      <rect x="714" y="38" width="11" height="402" fill="#131d2c" />

      {/* Emergency warning light strips at top */}
      <rect x="18" y="0" width="190" height="7" fill="rgba(225,30,30,0.92)" />
      <rect x="1232" y="0" width="190" height="7" fill="rgba(225,30,30,0.92)" />
      <rect x="18" y="0" width="7" height="90" fill="rgba(225,30,30,0.55)" />
      <rect x="1415" y="0" width="7" height="90" fill="rgba(225,30,30,0.55)" />

      {/* Red ambient glow from corners */}
      <rect width="1440" height="900" fill="url(#airlock-co-red-left)" />
      <rect width="1440" height="900" fill="url(#airlock-co-red-right)" />

      {/* Floor hazard stripes */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect key={`ls-${i}`} x={i * 28} y="848" width="14" height="52"
          fill="rgba(195,155,0,0.22)" />
      ))}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect key={`rs-${i}`} x={1426 - i * 28} y="848" width="14" height="52"
          fill="rgba(195,155,0,0.22)" />
      ))}
    </svg>
  );
};

export default CosmicOrb;
