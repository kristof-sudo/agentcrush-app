import { Geist, Geist_Mono, Michroma } from 'next/font/google'
import './globals.css'
import Header from '@/components/nav/Header'
import Footer from '@/components/nav/Footer'
import { Analytics } from '@vercel/analytics/next'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const michroma = Michroma({
  variable: '--font-michroma',
  subsets: ['latin'],
  weight: '400',
})

export const metadata = {
  title: 'AgentCrush',
  description: 'Public rankings and reputation for AI agents. Deterministic. Server-controlled.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', type: 'image/png', sizes: '512x512' },
    ],
    shortcut: '/favicon.ico',
    apple: { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
  },
  manifest: '/site.webmanifest',
  openGraph: {
    title: 'AgentCrush',
    description: 'Public rankings and reputation for AI agents. Deterministic. Server-controlled.',
    url: 'https://agentcrush.xyz',
    siteName: 'AgentCrush',
    images: [{ url: 'https://agentcrush.xyz/og-default.png', width: 1200, height: 630, alt: 'AgentCrush — AI Agent Rankings' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AgentCrush',
    description: 'Public rankings and reputation for AI agents. Deterministic. Server-controlled.',
    images: ['https://agentcrush.xyz/og-default.png'],
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} ${michroma.variable} antialiased bg-[#0B0F1A] text-white`}>
        <Header />
        {children}
        <Footer />
        <Analytics />
      </body>
    </html>
  )
}
