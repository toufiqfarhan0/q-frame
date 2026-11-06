import type { Metadata, Viewport } from "next";
import "./globals.css";
import { WalletProvider } from "./context/WalletContext";

export const metadata: Metadata = {
  metadataBase: new URL("https://qframe.network"),
  title: "Q-FRAME — Post-Quantum Frame Transactions on Alternative Mempools",
  other: {
    "darkreader-lock": "true",
  },
  description:
    "EIP-8141 & ERC-8421 implementation benchmarking NIST FIPS 205 quantum-resistant signature verification above canonical mempool gas barriers. Built at ETHGlobal Mumbai 2026.",
  keywords: [
    "Ethereum",
    "EIP-8141",
    "ERC-8421",
    "Post-Quantum",
    "Alternative Mempool",
    "NIST FIPS 205",
    "SPHINCS+",
    "Ethrex",
    "ETHGlobal Mumbai",
  ],
  authors: [{ name: "Q-Frame Protocol Research" }],
  openGraph: {
    title: "Q-FRAME — Post-Quantum Frame Transactions & Staked Mempools",
    description:
      "Benchmarking quantum-safe signature verification on Ethereum via EIP-8141 and ERC-8421. Breaking the 100k gas validation barrier with skin-in-the-game staking.",
    url: "https://qframe.network",
    siteName: "Q-Frame",
    images: [
      {
        url: "/og-swiss.png",
        width: 1200,
        height: 630,
        alt: "Q-FRAME Swiss Design Specification",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Q-FRAME — Post-Quantum Frame Transactions",
    description:
      "Benchmarking NIST FIPS 205 verification on EIP-8141 and ERC-8421 alternative mempools.",
  },
};

export const viewport: Viewport = {
  themeColor: "#D82C2C",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full bg-white text-[#1A1A1A]">
      <head>
        <meta name="darkreader-lock" />
      </head>
      <body suppressHydrationWarning className="min-h-full flex flex-col antialiased selection:bg-[#D82C2C] selection:text-white">
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}
