export const dynamic = 'force-dynamic'

export default async function CategoryPage({ params }) {
  const { slug } = params

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 md:px-6 text-white">
      <h1 className="text-4xl font-semibold">Category route works</h1>
      <p className="mt-4 text-white/70">Slug: {slug}</p>
    </main>
  )
}
