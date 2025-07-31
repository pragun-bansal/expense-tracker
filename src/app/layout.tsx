import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import ServiceWorkerCleanup from "@/components/ServiceWorkerCleanup";

// Simple navigation recovery script
const navigationRecoveryScript = `
  (function() {
    let routerBroken = false;
    
    // Listen for JavaScript errors
    window.addEventListener('error', function(e) {
      console.warn('JS Error detected:', e.error);
      
      // Test if we can still navigate
      setTimeout(function() {
        try {
          // If this fails, the router is likely broken
          if (window.next && window.next.router) {
            window.next.router.prefetch('/');
          }
        } catch (err) {
          console.warn('Router appears broken, enabling fallback navigation');
          enableFallbackNavigation();
        }
      }, 1000);
    });
    
    function enableFallbackNavigation() {
      if (routerBroken) return;
      routerBroken = true;
      
      // Convert all internal links to full page refreshes
      document.addEventListener('click', function(e) {
        const link = e.target.closest('a[href^="/"]');
        if (link && !e.ctrlKey && !e.metaKey && e.button === 0) {
          console.warn('Using fallback navigation for:', link.href);
          e.preventDefault();
          window.location.href = link.href;
        }
      }, true);
      
      console.warn('Fallback navigation activated');
    }
  })();
`

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fina",
  description: "Smart personal finance management and group expense splitting",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >

        <Providers>
          <ServiceWorkerCleanup />
          {children}
        </Providers>
        
        {/* Navigation recovery script */}
        <script 
          dangerouslySetInnerHTML={{ __html: navigationRecoveryScript }}
        />
      </body>
    </html>
  );
}
