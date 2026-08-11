import type { Metadata } from 'next';
import './globals.css';

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
    <html lang="en" className="dark">
      <body className="bg-[#09090b] text-[#fafafa] min-h-screen antialiased selection:bg-lime-400 selection:text-black">
        {children}
      </body>
    </html>
  );
}
