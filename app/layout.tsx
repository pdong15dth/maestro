import type {Metadata} from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { WorkspaceProvider } from '@/contexts/WorkspaceContext';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Maestro',
  description: 'Maestro - AI Agent CLI Wrapper and Code Review Dashboard',
  manifest: '/site.webmanifest',
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.ico', sizes: '48x48' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} dark`}>
      <head>
        <script dangerouslySetInnerHTML={{__html: `
          (function(){
            window.addEventListener('unhandledrejection', function(e){
              e.preventDefault();
              e.stopImmediatePropagation();
              var r = e.reason;
              var info = {
                reason: r,
                typeof: typeof r,
                constructor: r && r.constructor ? r.constructor.name : null,
                json: (function(){ try { return JSON.stringify(r); } catch(_) { return '[circular]'; } })()
              };
              console.warn('[Unhandled Rejection]', info);
            }, true);
          })();
        `}} />
      </head>
      <body className="font-mono bg-[#09090B] text-[#FAFAFA] min-h-screen selection:bg-[#27272A]" suppressHydrationWarning>
        <WorkspaceProvider>
          {children}
        </WorkspaceProvider>
      </body>
    </html>
  );
}

