---
name: Iron Ore Conveyor HMI / SCADA
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#444653'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#757684'
  outline-variant: '#c4c5d5'
  surface-tint: '#3755c3'
  primary: '#00288e'
  on-primary: '#ffffff'
  primary-container: '#1e40af'
  on-primary-container: '#a8b8ff'
  inverse-primary: '#b8c4ff'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#003757'
  on-tertiary: '#ffffff'
  tertiary-container: '#004f7a'
  on-tertiary-container: '#77c2ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dde1ff'
  primary-fixed-dim: '#b8c4ff'
  on-primary-fixed: '#001453'
  on-primary-fixed-variant: '#173bab'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#cce5ff'
  tertiary-fixed-dim: '#93ccff'
  on-tertiary-fixed: '#001d31'
  on-tertiary-fixed-variant: '#004b73'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-lg:
    fontFamily: IBM Plex Mono
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: IBM Plex Mono
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: IBM Plex Mono
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: 0em
  body-lg:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  body-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: IBM Plex Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-md:
    fontFamily: IBM Plex Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.04em
  label-sm:
    fontFamily: IBM Plex Mono
    fontSize: 9px
    fontWeight: '600'
    lineHeight: 12px
    letterSpacing: 0.06em
  metric-display:
    fontFamily: IBM Plex Mono
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.03em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 0.75rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.375rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

This design system establishes a high-density, mission-critical engineering interface tailored for real-time SCADA and HMI supervision of bulk material handling and iron ore conveyor belt installations. 

The aesthetic is anchored in light industrial engineering: clean galvanized instrument panel card surfaces, precision 1px delineation lines, mechanical enclosure cues, and pure utilitarian focus. It deliberately rejects consumer SaaS decorative trends—no floating glass effects, no non-functional decorative gradients, and no ambient glows.

The visual style bridges classic industrial physical instrumentation panels (DIN-rail mounted displays, physical terminal cards, analog tick graduations) with contemporary high-density telemetry dashboards. The system prioritizes immediate legibility, rigorous visual ergonomics under high-glare control room conditions, and instantaneous operator triage of faults, motor torque, drive speed, and idler vibration.

## Colors

The palette is engineered for maximum contrast, zero ambiguity, and strict adherence to industrial ISA-101 / IEC standards for process automation.

### Core Framework Roles
- **Primary Industrial Blue (`#1E40AF` / `#2563EB`)**: Denotes primary system commands, active selections, drive links, and focused mechanical subsystems.
- **Secondary Deep Slate (`#0F172A` / `#1E293B`)**: Used for persistent telemetry headers, high-contrast metric values, technical terminal borders, and primary status text.
- **Instrument Surface Foundation (`#F8FAFC` base, `#FFFFFF` cards)**: Neutral light steel panels that maximize daytime readability without causing eye strain. Frame borders use `#CBD5E1` and `#E2E8F0`.
- **Metallic Neutral Tier (`#D1D5DB`, `#94A3B8`, `#64748B`)**: Applied across gauge graduation tick marks, rail separators, inactive tracks, and parameter units (`kN`, `t/h`, `m/s`, `°C`).

### Process Status & Safety Telemetry
- **Normal / Running (`#16A34A`)**: Process running within nominal parameters; continuous convey operational status.
- **Warning / Degraded (`#D97706`)**: Minor misalignment, belt slip, thermal elevation, or scheduled preventative intervention required.
- **Critical / Emergency Alarm (`#DC2626`)**: Emergency pull-cord trip, severe motor overload, chute blockage, rip detection trigger.
- **Informational / Auto-Control (`#0284C7`)**: Dynamic take-up positioning, automated PLC logic state, auxiliary idler status.

## Typography

Typography enforces absolute visual precision. **IBM Plex Mono** is mandated for all numeric values, telemetry readouts, tag identifiers (e.g., `CV-814-TR-01`), coordinates, and instrument scales to ensure tabular alignment across continuous live updates.

**Inter** is employed for descriptions, long-form system logs, and nested equipment hierarchies where human readability and compact vertical rhythm take precedence.

All metric readout numbers must enforce `font-feature-settings: "tnum" on, "zero" on` to prevent layout reflow during high-frequency SCADA socket data refreshes.

## Layout & Spacing

The layout model is a modular, fluid engineering rack system optimized for widescreen industrial workstations (1920x1080 and multi-monitor SCADA walls) with compact 12-column grid tracks.

Margins are restricted to `1rem` to maximize actionable operational surface area. Gutters use a tight `0.75rem` spacing. Layouts prioritize spatial density: tables, conveyor profile sketches, and drive telemetry stacks share synchronized horizontal axes. 

Breakpoints:
- **Desktop / Control Room Console (>= 1280px)**: 3-column split view (Left: equipment tree/profile schematic, Center: continuous data matrix / idler array, Right: analog gauge rack and alarm log).
- **Ruggedized Tablet / Portable HMI (768px - 1279px)**: 2-column view with collapsible diagnostics side drawer.
- **Handheld Maintenance Field Unit (< 768px)**: Single-column linear stack; gauge racks collapse into sequential segmented bar meters.

## Elevation & Depth

Visual hierarchy is communicated via physical enclosure paneling, crisp single-pixel borders, and subtle structural offsets rather than soft diffuse shadows:

- **Surface Level 0 (Chassis Floor)**: `#F1F5F9` neutral matte steel background.
- **Surface Level 1 (Card & Rack Modules)**: `#FFFFFF` or `#F8FAFC` faceplates bordered with `1px solid #CBD5E1`.
- **Surface Level 2 (Recessed Data Wells / Gauge Beds)**: `#E2E8F0` or `#0F172A` (dark HUD display boxes) with a `1px inset 0 1px 2px rgba(0,0,0,0.08)` to simulate stamped sheet metal and physical bezels.
- **Surface Level 3 (Active Overlays / Override Prompts)**: `#FFFFFF` surface with an assertive, contained drop shadow: `0 4px 6px -1px rgba(15, 23, 42, 0.15), 0 0 0 1px #94A3B8`.

## Shapes

The design system uses a strict **Soft (`1`)** shape language:
- All cards, panels, input fields, and indicator blocks feature a maximum corner radius of `0.25rem` (`4px`).
- Technical badges, status chips, and table cells use `2px` or sharp `0px` bevels to reinforce structural rigidity and high-density packaging.
- Pill shapes and oversized circular buttons are banned, except for circular LED indicators, needle pivots, and analog gauge dials.

## Components

### Buttons & Actuators
- **Primary Control Buttons**: Flat `#1E40AF` background, white text, 1px `#1E3A8A` border, `0.25rem` radius, 32px standard height. Pressed state employs a `inset 0 2px 4px rgba(0,0,0,0.2)` tactile depression.
- **Secondary / Command Strip**: `#F8FAFC` background, 1px `#CBD5E1` border, `#0F172A` monospace text. Hover: `#E2E8F0`.
- **E-Stop / Emergency Reset**: High-contrast `#DC2626` outline with solid `#FEE2E2` fill, 2px border, uppercase bold monospace label.

### Status Indicators & Annunciator Chips
- Rectangular LED status chips (e.g., `RUNNING`, `TRIP`, `LOCKED OUT`): 22px height, 2px corner radius, bold IBM Plex Mono `9px` uppercase text with 1px border matching the status color.
- A circular `6px` hardware LED indicator precedes the text (pulsing green for continuous nominal motor feedback; solid red for active interlock breach).

### Telemetry Tables & Data Grids
- Row heights clamped to `28px` for ultra-dense data scrutiny.
- Alternate row striping using `#F8FAFC` and `#FFFFFF`.
- Cell borders: hairline `1px solid #E2E8F0`.
- Monospace tabular alignment: numeric values right-aligned; conveyor IDs and units left-aligned.

### Analog & Linear Gauge Graduations
- Linear tension and drive power utilization bars feature stamped ticks at 10%, 25%, 50%, 75%, 90%, and 100% calibration points.
- Normal operational range is rendered in steel blue/slate, transitioning cleanly to amber above 85% utilization and solid red above 95%.
- Needle readouts and dial dials use crisp 1px strokes with a central metallic pivot pin representation.

### Form Inputs & Setpoint Steppers
- Height 30px, `#FFFFFF` interior, `1px solid #94A3B8` border, monospace input font.
- Focus state: `1px solid #1E40AF` with zero glow; setpoint limits displayed as inline secondary monospace labels (`MIN: 0.0 / MAX: 500.0 kN`).