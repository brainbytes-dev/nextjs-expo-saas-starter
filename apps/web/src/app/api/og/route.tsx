import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const title = searchParams.get("title") || "Dein Lager. Zentral.";
  const description =
    searchParams.get("description") ||
    "Inventar- und Werkzeugverwaltung für Schweizer KMU.";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#236B56",
          fontFamily: "Inter, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Grid pattern overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* Subtle radial glow */}
        <div
          style={{
            position: "absolute",
            top: "-200px",
            right: "-200px",
            width: "600px",
            height: "600px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(217,119,6,0.15) 0%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "60px 80px",
            zIndex: 1,
            textAlign: "center",
          }}
        >
          {/* Wordmark */}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "baseline",
              marginBottom: "40px",
            }}
          >
            <span
              style={{
                fontSize: "64px",
                fontWeight: 700,
                color: "#FFFFFF",
                letterSpacing: "4px",
              }}
            >
              ZEN
            </span>
            <span
              style={{
                fontSize: "64px",
                fontWeight: 400,
                color: "#FFFFFF",
                letterSpacing: "4px",
              }}
            >
              TORY
            </span>
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: "48px",
              fontWeight: 700,
              color: "#FFFFFF",
              lineHeight: 1.2,
              marginBottom: "20px",
              maxWidth: "900px",
              display: "flex",
            }}
          >
            {title}
          </div>

          {/* Description */}
          <div
            style={{
              fontSize: "24px",
              fontWeight: 400,
              color: "rgba(255,255,255,0.7)",
              lineHeight: 1.5,
              maxWidth: "800px",
              display: "flex",
            }}
          >
            {description}
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            position: "absolute",
            bottom: "0",
            left: "0",
            right: "0",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "24px",
          }}
        >
          <div
            style={{
              fontSize: "18px",
              fontWeight: 400,
              color: "rgba(255,255,255,0.5)",
              letterSpacing: "2px",
              display: "flex",
            }}
          >
            zentory.ch
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
