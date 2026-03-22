import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Systemstatus | LogistikApp",
  description: "Aktueller Systemstatus und Betriebsinformationen von LogistikApp.",
};

export default function StatusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}
