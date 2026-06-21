import { ImageResponse } from "next/og";

// Route segment config
export const runtime = "edge";

// Image metadata
export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

// Image generation
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0A0A0F",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#7C3AED",
          borderRadius: "6px",
          padding: "3px",
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width="32"
          height="32"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Outlined rounded-square */}
          <rect x="2" y="2" width="20" height="20" rx="6" stroke="currentColor" strokeWidth="2.5" fill="none" />
          {/* Inner solid triangle pointing right */}
          <polygon points="10,8 16,12 10,16" fill="currentColor" stroke="none" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
