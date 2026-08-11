import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Mobile SDK Detector | High-Performance Crawl & SQL Query Profiler',
  description: 'Lightweight ETL pipeline, static signature detection engine, and database query latency profiler built for high-scale app store intelligence.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <body className="bg-white text-slate-900 min-h-screen antialiased selection:bg-lime-300 selection:text-black font-sans">
        {children}
      </body>
    </html>
  );
}
