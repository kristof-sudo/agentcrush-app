export default function Card({ children, className = '' }) {
  return (
    <div className={
      "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-lg " + className
    }>
      {children}
    </div>
  )
}
