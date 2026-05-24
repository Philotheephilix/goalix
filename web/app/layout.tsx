import type { Metadata } from "next";
import { Tomorrow } from "next/font/google";
import "./globals.css";
import Provider from "./components/Provider";
import TopNav from "./components/ui/topnavbar";
import DotGrid from "./components/ui/dotGrid";

const tomorrow = Tomorrow({
  variable: "--font-tomorrow",
  subsets: ["latin"],
  weight: ["400", "700","200","300","500","600"],
});

export const metadata: Metadata = {
  title: "Goalix - Player Tokenization Platform",
  description:
    "Transform players into tradeable tokens. Performance drives value. Real rewards for real performance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full"
      style={{ fontFamily: "var(--font-tomorrow)" }}
    >
      <head></head>
      <body
        className={`${tomorrow.variable} antialiased bg-black text-white relative`}
      >
        <Provider>
          {/* Global dot background pattern */}
          <div className="fixed inset-0 opacity-30 pointer-events-none z-0">
            <DotGrid
              dotSize={2}
              gap={15}
              baseColor="#ffffff"
              activeColor="#CF0A0A"
              proximity={120}
              shockRadius={250}
              shockStrength={5}
              resistance={750}
              returnDuration={1.5}
            />
          </div>

          {/* Navigation Bar - will be hidden on landing page by TopNav component */}
          <TopNav />

          {/* Main content with conditional padding */}
          <div className="relative z-10">
            {children}
          </div>
        </Provider>
      </body>
    </html>
  );
}
