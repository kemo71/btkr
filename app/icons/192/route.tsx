import { ImageResponse } from "next/og";

export const dynamic = "force-static";

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          color: "white",
          fontSize: 130,
          fontWeight: 700,
          letterSpacing: -4,
        }}
      >
        b
      </div>
    ),
    { width: 192, height: 192 },
  );
}
