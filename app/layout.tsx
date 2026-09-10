import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./ui-rebuild.css";

export const metadata: Metadata = {
  title: "レリック・ラッシュ",
  description: "1プレイ約2分。ドットキャラクターで戦う縦画面ファンタジー編成RPG。",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/favicon.svg", apple: "/favicon.svg" },
};

export const viewport: Viewport = { width:"device-width", initialScale:1, maximumScale:1, userScalable:false, viewportFit:"cover", themeColor:"#07111c" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><body>{children}</body></html>;
}
