import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  title: 'DISGUISE-ID — AI Face Recognition Security System',
  description: 'Sistem verifikasi wajah berteknologi AI untuk keamanan publik berbasis CCTV pintar. Deteksi identitas meski wajah tertutup masker, helm, atau kacamata.',
  keywords: 'face recognition, AI security, CCTV, disguise detection, wajah tersembunyi',
  openGraph: {
    title: 'DISGUISE-ID — AI Face Recognition Security System',
    description: 'Sistem verifikasi wajah berteknologi AI untuk keamanan publik',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
