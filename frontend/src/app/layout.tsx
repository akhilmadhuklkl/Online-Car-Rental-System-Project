import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rove | Car rental, your way",
  description: "Find a car for your next Kerala road trip with Rove.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
