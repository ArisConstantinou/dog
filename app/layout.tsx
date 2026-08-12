import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://arisconstantinou.github.io/dog/"),
  title: "Leo — Always With You",
  description: "Five interactive worlds built around Leo, a beloved Jack Russell Terrier.",
  openGraph: {
    title: "Leo — Always With You",
    description: "Meet, play with, and remember Leo across five interactive worlds.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
