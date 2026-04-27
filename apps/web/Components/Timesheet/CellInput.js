import { useEffect, useRef, useState } from "react";
import { MoreVertical } from "lucide-react";

function pad(n) {
  return String(n).padStart(2, "0");
}

export function formatHMS(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

export function parseHMS(value) {
  if (value === null || value === undefined) return 0;
  const raw = String(value).trim();
  if (!raw) return 0;

  if (/^\d+(\.\d+)?$/.test(raw) && raw.includes(".")) {
    const hours = parseFloat(raw);
    return Math.round(hours * 3600);
  }

  const parts = raw.split(":").map((p) => p.trim());
  let h = 0;
  let m = 0;
  let s = 0;

  if (parts.length === 1) {
    const digits = parts[0];
    if (/^\d{1,4}$/.test(digits)) {
      const n = parseInt(digits, 10);
      if (digits.length <= 2) {
        m = n;
      } else {
        h = Math.floor(n / 100);
        m = n % 100;
      }
    }
  } else if (parts.length === 2) {
    h = parseInt(parts[0] || "0", 10);
    m = parseInt(parts[1] || "0", 10);
  } else if (parts.length >= 3) {
    h = parseInt(parts[0] || "0", 10);
    m = parseInt(parts[1] || "0", 10);
    s = parseInt(parts[2] || "0", 10);
  }

  if (![h, m, s].every(Number.isFinite)) return 0;
  const total = h * 3600 + m * 60 + s;
  return Math.max(0, Math.min(total, 24 * 3600));
}

function CellInput({
  valueSec = 0,
  onCommit,
  onOpenDetails,
  onFocusCell,
  onBlurCell,
  presence,
  locked = false,
  lockedReason,
  dense = true,
}) {
  const [text, setText] = useState(valueSec ? formatHMS(valueSec) : "");
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!focused) setText(valueSec ? formatHMS(valueSec) : "");
  }, [valueSec, focused]);

  const commit = () => {
    const next = parseHMS(text);
    if (next === valueSec) {
      setText(valueSec ? formatHMS(valueSec) : "");
      return;
    }
    onCommit?.(next);
  };

  const height = dense ? 30 : 42;
  const showDots = !locked && valueSec > 0 && (hovered || focused);

  let borderColor = "#d8dde3";
  let borderWidth = 1;
  if (focused) {
    borderColor = "#03A9F4";
    borderWidth = 2;
  } else if (presence?.color) {
    borderColor = presence.color;
    borderWidth = 2;
  } else if (hovered && !locked) {
    borderColor = "#a7dcf5";
    borderWidth = 1;
  }

  return (
    <div
      style={{ position: "relative", width: "100%" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onFocus={(e) => {
          setFocused(true);
          e.target.select();
          onFocusCell?.();
        }}
        onBlur={() => {
          setFocused(false);
          commit();
          onBlurCell?.();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.target.blur();
          } else if (e.key === "Escape") {
            setText(valueSec ? formatHMS(valueSec) : "");
            e.target.blur();
          }
        }}
        disabled={locked}
        title={locked ? lockedReason : undefined}
        placeholder=""
        style={{
          width: "100%",
          height,
          padding: "0 8px",
          textAlign: "center",
          fontVariantNumeric: "tabular-nums",
          fontSize: 13,
          color: valueSec ? "#1f2937" : "#9ca3af",
          background: locked ? "#fafafa" : "#fff",
          border: `${borderWidth}px solid ${borderColor}`,
          borderRadius: 3,
          outline: "none",
          boxSizing: "border-box",
          transition:
            "height 240ms cubic-bezier(0.22, 1, 0.36, 1), border-color 120ms ease",
        }}
      />
      {presence && !focused && (
        <span
          title={`${presence.name || presence.email || 'Someone'} is editing`}
          style={{
            position: 'absolute',
            top: -4,
            right: -4,
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: presence.color || '#FF8A00',
            color: '#fff',
            fontSize: 10,
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid #fff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
            zIndex: 3,
            pointerEvents: 'none',
            animation: 'cellPulse 1.6s ease-in-out infinite',
          }}
        >
          {(presence.name || presence.email || '?')[0]?.toUpperCase()}
        </span>
      )}
      <style>{`
        @keyframes cellPulse {
          0% { transform: scale(0.95); }
          50% { transform: scale(1.08); }
          100% { transform: scale(0.95); }
        }
      `}</style>
      {showDots && (
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onOpenDetails?.();
          }}
          title="Edit time details"
          style={{
            position: "absolute",
            top: "50%",
            right: -6,
            transform: "translateY(-50%)",
            padding: "30px 0, ",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            color: "#6b7280",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2,
            transition: "color 120ms ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#03A9F4";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "#6b7280";
          }}
        >
          <MoreVertical size={18} strokeWidth={2.2} />
        </button>
      )}
    </div>
  );
}

export default CellInput;
