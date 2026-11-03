'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { crearLibro } from './actions'

export default function FormularioVinculacion({ tagId }: { tagId: string }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pendiente, startTransition] = useTransition()

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      const r = await crearLibro(tagId, {
        titulo: String(f.get('titulo') ?? ''),
        autor: String(f.get('autor') ?? ''),
        totalPaginas: parseInt(String(f.get('paginas')), 10),
        totalCapitulos: parseInt(String(f.get('capitulos')), 10),
      })
      if (r.error) setError(r.error)
      else router.refresh() // el servidor ya encuentra el libro y muestra el dashboard
    })
  }

  const campo =
    'mt-2 w-full rounded-xl border border-line bg-surface px-4 py-3.5 text-paper placeholder:text-muted/60 outline-none transition-colors focus:border-ribbon'

  return (
    <main className="mx-auto min-h-dvh max-w-md px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(3rem,env(safe-area-inset-top))]">
      <h1 className="font-display text-4xl leading-tight">Vincula un libro a esta tarjeta</h1>
      <p className="mt-3 leading-relaxed text-muted">
        Es la primera vez que se lee esta tarjeta. Cuéntanos qué libro estás leyendo
        y quedará guardado para siempre.
      </p>

      <form onSubmit={enviar} className="mt-10 space-y-6">
        <label className="block text-sm text-muted">
          Título
          <input name="titulo" required maxLength={160} autoComplete="off"
            placeholder="El nombre de la rosa" className={campo} />
        </label>
        <label className="block text-sm text-muted">
          Autor
          <input name="autor" required maxLength={120} autoComplete="off"
            placeholder="Umberto Eco" className={campo} />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="block text-sm text-muted">
            Páginas
            <input name="paginas" type="number" inputMode="numeric" min={1} required
              placeholder="560" className={campo} />
          </label>
          <label className="block text-sm text-muted">
            Capítulos
            <input name="capitulos" type="number" inputMode="numeric" min={1} max={200} required
              placeholder="12" className={campo} />
          </label>
        </div>

        {error && (
          <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        )}

        <button type="submit" disabled={pendiente}
          className="h-14 w-full rounded-2xl bg-ribbon font-medium text-ribbon-ink transition active:scale-[0.98] disabled:opacity-60">
          {pendiente ? 'Guardando…' : 'Vincular libro'}
        </button>
      </form>
    </main>
  )
}
