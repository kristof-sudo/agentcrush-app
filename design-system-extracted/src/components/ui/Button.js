import Link from 'next/link'

export default function Button({ href, children, variant = 'primary' }) {
  const base = "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition"
  const styles = variant === 'primary'
    ? "bg-gradient-to-r from-blue-600 to-violet-600 text-white hover:opacity-90"
    : "border border-white/15 text-white/90 hover:bg-white/5"
  return href ? (
    <Link className={`${base} ${styles}`} href={href}>{children}</Link>
  ) : (
    <button className={`${base} ${styles}`}>{children}</button>
  )
}
