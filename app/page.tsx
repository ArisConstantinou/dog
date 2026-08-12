import type { Metadata } from "next";
import LeoApp from "./LeoApp";

export const metadata: Metadata = {
  title: "Leo — Always With You",
  description: "A private interactive likeness and living memory of Leo, a beloved Jack Russell Terrier.",
};

export default function Home() {
  return <LeoApp />;
}
