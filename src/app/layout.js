import "./globals.css";
import Providers from "@/components/Providers";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Zambeel SEO",
  description: "SEO management platform for Zambeel",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
