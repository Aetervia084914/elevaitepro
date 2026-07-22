
import {
  Bricolage_Grotesque,
  DM_Sans,
  Exo_2,
  Inter,
  Manrope,
  Space_Grotesk,
  Space_Mono,
  Unbounded,
} from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });
const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});
const spaceMono = Space_Mono({
  subsets: ["latin"],
  variable: "--font-space-mono",
  weight: ["400", "700"],
});
const bricolageGrotesque = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage-grotesque",
});
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});
const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dmsans",
  display: "swap",
});
const exo2 = Exo_2({
  subsets: ["latin"],
  variable: "--font-exo-2",
});
const unbounded = Unbounded({
  subsets: ["latin"],
  variable: "--font-unbounded",
});

export const metadata = {
  title: "elevAIte pro",
  description: "Creative greetings powered by Gemini AI",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${manrope.variable} ${spaceGrotesk.variable} ${spaceMono.variable} ${bricolageGrotesque.variable} ${bricolage.variable} ${dmSans.variable} ${exo2.variable} ${unbounded.variable}`}>
        {children}
      </body>
    </html>
  );
}
