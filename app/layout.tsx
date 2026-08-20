import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "www.3dtsi.com";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  const socialImage = new URL("/og.png", origin).toString();

  return {
    metadataBase: new URL(origin),
    title: "Material Request | 3D Technology Services",
    description: "Submit complete project material requests to 3D Technology Services purchasing.",
    icons: {
      icon: "/3dtsi-logo.png",
      shortcut: "/3dtsi-logo.png",
    },
    openGraph: {
      title: "Material Request | 3D Technology Services",
      description: "A clear, complete workflow for project material requests.",
      type: "website",
      images: [{ url: socialImage, width: 1731, height: 909, alt: "3D Technology Services Material Request" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Material Request | 3D Technology Services",
      description: "A clear, complete workflow for project material requests.",
      images: [socialImage],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
