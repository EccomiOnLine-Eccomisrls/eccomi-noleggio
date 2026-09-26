import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import EccomiTerminology from "./eccomi-terminology";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});


const openAiAdsPixelBootstrap = `
(function (w, d, s, u) {
  if (w.oaiq) return;

  var q = function () {
    q.q.push(arguments);
  };

  q.q = [];
  w.oaiq = q;

  var j = d.createElement(s);
  j.async = true;
  j.src = u;

  var f = d.getElementsByTagName(s)[0];

  if (f && f.parentNode) {
    f.parentNode.insertBefore(j, f);
  } else if (d.head) {
    d.head.appendChild(j);
  }
})(
  window,
  document,
  "script",
  "https://bzrcdn.openai.com/sdk/oaiq.min.js"
);

window.oaiq(
  "init",
  {
    pixelId: "GiUebj6gpbj7aEBW9JfgZ8",
    debug: true
  }
);
`;

export const metadata: Metadata = {
  title: "ECCOMI NOLEGGIO",
  description: "Pannello operativo per promozioni, lead, partner e commissioni ECCOMI NOLEGGIO.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <script
          dangerouslySetInnerHTML={{ __html: openAiAdsPixelBootstrap }}
        />
        <EccomiTerminology />
        {children}
      </body>
    </html>
  );
}
