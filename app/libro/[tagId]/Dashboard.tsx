'use client'

import { useMemo, useState, useTransition } from 'react'
import { actualizarProgreso, anadirNota, borrarNota } from './actions'
import type { Capitulo, Libro, Nota } from '@/lib/types'

type Props = { libro: Libro; capitulos: Capitulo[]; notas: Nota[] }

const limitar = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max)

const botonPaso =
  'h-14 rounded-2xl border border-line bg-surface text-lg font-medium tabular-nums text-paper transition active:scale-95 active:bg-raised disabled:opacity-40'

export default function Dashboard({ libro, capitulos, notas: notasIniciales }: Props) {
  const [pagina, setPagina] = useState(libro.pagina_actual)
  const [capitulo, setCapitulo] = useState(libro.capitulo_actual)
  const [notas, setNotas] = useState<Nota[]>(notasIniciales)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  // edición directa de la página
  const [editandoPagina, setEditandoPagina] = useState(false)
  const [borradorPagina, setBorradorPagina] = useState('')

  // formulario de anotación
  const [componiendo, setComponiendo] = useState(false)
  const [texto, setTexto] = useState('')
  const [paginaNota, setPaginaNota] = useState('')
  const [capNota, setCapNota] = useState(libro.capitulo_actual)
  const [tipo, setTipo] = useState<'nota' | 'cita'>('nota')

  const porcentaje = Math.round((pagina / libro.total_paginas) * 100)

  // Actualización optimista: la UI responde al instante y se revierte si falla
  function guardar(nuevaPagina: number, nuevoCapitulo: number) {
    const anterior = { p: pagina, c: capitulo }
    setPagina(nuevaPagina)
    setCapitulo(nuevoCapitulo)
    setError(null)
    startTransition(async () => {
      const r = await actualizarProgreso(libro.id, nuevaPagina, nuevoCapitulo)
      if (r.error) {
        setPagina(anterior.p)
        setCapitulo(anterior.c)
        setError(r.error)
      }
    })
  }

  const mover = (delta: number) =>
    guardar(limitar(pagina + delta, 0, libro.total_paginas), capitulo)
  const irACapitulo = (n: number) =>
    guardar(pagina, limitar(n, 1, libro.total_capitulos))

  function confirmarPagina() {
    const n = parseInt(borradorPagina, 10)
    if (!Number.isNaN(n)) guardar(limitar(n, 0, libro.total_paginas), capitulo)
    setEditandoPagina(false)
  }

  function abrirComposer() {
    setPaginaNota(String(Math.max(pagina, 1)))
    setCapNota(capitulo)
    setComponiendo(true)
  }

  function enviarNota(e: React.FormEvent) {
    e.preventDefault()
    const cap = capitulos.find((c) => c.numero === capNota)
    const pag = parseInt(paginaNota, 10)
    if (!cap || !texto.trim() || Number.isNaN(pag) || pag < 1 || pag > libro.total_paginas) {
      setError('Revisa el texto y que la página esté entre 1 y ' + libro.total_paginas + '.')
      return
    }
    setError(null)
    startTransition(async () => {
      const r = await anadirNota({
        libroId: libro.id,
        capituloId: cap.id,
        pagina: pag,
        texto: texto.trim(),
        tipo,
      })
      if (r.error || !r.nota) {
        setError(r.error ?? 'No se pudo guardar la anotación.')
        return
      }
      setNotas((prev) => [...prev, r.nota!])
      setTexto('')
      setComponiendo(false)
    })
  }

  function eliminar(id: string) {
    if (!confirm('¿Eliminar esta anotación?')) return
    const previas = notas
    setNotas((n) => n.filter((x) => x.id !== id))
    startTransition(async () => {
      const r = await borrarNota(id)
      if (r.error) {
        setNotas(previas)
        setError(r.error)
      }
    })
  }

  const grupos = useMemo(
    () =>
      capitulos
        .map((cap) => ({
          cap,
          items: notas.filter((n) => n.capitulo_id === cap.id).sort((a, b) => a.pagina - b.pagina),
        }))
        .filter((g) => g.items.length > 0),
    [capitulos, notas]
  )

  return (
    <main className="mx-auto min-h-dvh max-w-md px-6 pb-[max(3rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))]">
      {/* Cabecera */}
      <header>
        <p className="text-sm text-muted">{libro.autor}</p>
        <h1 className="mt-1 font-display text-3xl leading-tight">{libro.titulo}</h1>
      </header>

      {/* Progreso */}
      <section className="mt-10" aria-label="Progreso de lectura">
        <div className="flex items-end justify-between">
          <div className="flex items-baseline gap-2">
            {editandoPagina ? (
              <form onSubmit={(e) => { e.preventDefault(); confirmarPagina() }}>
                <input
                  autoFocus
                  type="number"
                  inputMode="numeric"
                  value={borradorPagina}
                  onChange={(e) => setBorradorPagina(e.target.value)}
                  onBlur={confirmarPagina}
                  className="w-32 border-b border-ribbon bg-transparent font-display text-6xl tabular-nums outline-none"
                />
              </form>
            ) : (
              <button
                onClick={() => { setBorradorPagina(String(pagina)); setEditandoPagina(true) }}
                className="font-display text-6xl tabular-nums leading-none"
                aria-label={`Página ${pagina}. Toca para cambiarla`}
              >
                {pagina}
              </button>
            )}
            <span className="text-muted">de {libro.total_paginas}</span>
          </div>
          <span className="font-display text-2xl tabular-nums text-ribbon">{porcentaje}%</span>
        </div>

        <div
          className="mt-5 h-1.5 overflow-hidden rounded-full bg-raised"
          role="progressbar" aria-valuenow={porcentaje} aria-valuemin={0} aria-valuemax={100}
        >
          <div className="h-full rounded-full bg-ribbon transition-[width] duration-500"
               style={{ width: `${porcentaje}%` }} />
        </div>
        <p className="mt-3 text-sm text-muted">
          Capítulo {capitulo} de {libro.total_capitulos}
        </p>
      </section>

      {/* Controles de página */}
      <section className="mt-8 grid grid-cols-[1fr_1fr_2fr_1fr] gap-2.5" aria-label="Cambiar página">
        <button className={botonPaso} onClick={() => mover(-10)} disabled={pagina <= 0}>−10</button>
        <button className={botonPaso} onClick={() => mover(-1)} disabled={pagina <= 0}>−1</button>
        <button
          className="h-14 rounded-2xl bg-ribbon text-lg font-semibold text-ribbon-ink transition active:scale-95 disabled:opacity-40"
          onClick={() => mover(1)} disabled={pagina >= libro.total_paginas}
        >
          +1 página
        </button>
        <button className={botonPaso} onClick={() => mover(10)} disabled={pagina >= libro.total_paginas}>+10</button>
      </section>

      {/* Selector de capítulo */}
      <section className="mt-3 flex items-center gap-2.5" aria-label="Capítulo actual">
        <button className={`${botonPaso} w-14 shrink-0`} onClick={() => irACapitulo(capitulo - 1)}
                disabled={capitulo <= 1} aria-label="Capítulo anterior">‹</button>
        <select
          value={capitulo}
          onChange={(e) => irACapitulo(Number(e.target.value))}
          className="h-14 min-w-0 flex-1 rounded-2xl border border-line bg-surface px-4 text-center text-paper outline-none focus:border-ribbon"
        >
          {capitulos.map((c) => (
            <option key={c.id} value={c.numero}>
              Capítulo {c.numero}{c.titulo ? ` · ${c.titulo}` : ''}
            </option>
          ))}
        </select>
        <button className={`${botonPaso} w-14 shrink-0`} onClick={() => irACapitulo(capitulo + 1)}
                disabled={capitulo >= libro.total_capitulos} aria-label="Capítulo siguiente">›</button>
      </section>

      {error && (
        <p role="alert" className="mt-5 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}

      {/* Anotaciones */}
      <section className="mt-14" aria-label="Anotaciones">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">Anotaciones</h2>
          {!componiendo && (
            <button onClick={abrirComposer}
              className="rounded-full border border-line px-4 py-2 text-sm text-paper transition active:bg-raised">
              Añadir
            </button>
          )}
        </div>

        {componiendo && (
          <form onSubmit={enviarNota} className="mt-5 space-y-3 rounded-2xl border border-line bg-surface p-4">
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-ink p-1" role="group" aria-label="Tipo">
              {(['nota', 'cita'] as const).map((t) => (
                <button key={t} type="button" onClick={() => setTipo(t)}
                  className={`h-10 rounded-lg text-sm transition ${
                    tipo === t ? 'bg-raised text-paper' : 'text-muted'
                  }`}>
                  {t === 'nota' ? 'Nota' : 'Cita'}
                </button>
              ))}
            </div>
            <textarea
              value={texto} onChange={(e) => setTexto(e.target.value)} rows={4} autoFocus
              placeholder={tipo === 'cita' ? 'Copia la frase tal como aparece…' : 'Qué piensas de este pasaje…'}
              className="w-full resize-none rounded-xl border border-line bg-ink px-4 py-3 text-paper placeholder:text-muted/60 outline-none focus:border-ribbon"
            />
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs text-muted">
                Página
                <input type="number" inputMode="numeric" min={1} max={libro.total_paginas}
                  value={paginaNota} onChange={(e) => setPaginaNota(e.target.value)}
                  className="mt-1 h-12 w-full rounded-xl border border-line bg-ink px-3 text-paper outline-none focus:border-ribbon" />
              </label>
              <label className="text-xs text-muted">
                Capítulo
                <select value={capNota} onChange={(e) => setCapNota(Number(e.target.value))}
                  className="mt-1 h-12 w-full rounded-xl border border-line bg-ink px-3 text-paper outline-none focus:border-ribbon">
                  {capitulos.map((c) => <option key={c.id} value={c.numero}>{c.numero}</option>)}
                </select>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button type="button" onClick={() => setComponiendo(false)}
                className="h-12 rounded-xl border border-line text-muted transition active:bg-raised">
                Cancelar
              </button>
              <button type="submit"
                className="h-12 rounded-xl bg-ribbon font-medium text-ribbon-ink transition active:scale-[0.98]">
                Guardar
              </button>
            </div>
          </form>
        )}

        {grupos.length === 0 && !componiendo && (
          <p className="mt-6 leading-relaxed text-muted">
            Aún no hay anotaciones. Guarda una frase o una idea cuando encuentres algo que merezca la pena.
          </p>
        )}

        <div className="mt-6 space-y-8">
          {grupos.map(({ cap, items }) => (
            <div key={cap.id}>
              <h3 className="text-sm text-muted">
                Capítulo {cap.numero}{cap.titulo ? ` · ${cap.titulo}` : ''}
              </h3>
              <ul className="mt-3 space-y-3">
                {items.map((n) => (
                  <li key={n.id}
                    className={`rounded-2xl border bg-surface p-4 ${
                      n.tipo === 'cita' ? 'border-l-2 border-line border-l-ribbon' : 'border-line'
                    }`}>
                    <p className={`whitespace-pre-wrap leading-relaxed ${
                      n.tipo === 'cita' ? 'font-display text-[1.05rem] italic' : ''
                    }`}>
                      {n.tipo === 'cita' ? `“${n.texto}”` : n.texto}
                    </p>
                    <div className="mt-3 flex items-center justify-between text-xs text-muted">
                      <span>{n.tipo === 'cita' ? 'Cita' : 'Nota'} · página {n.pagina}</span>
                      <button onClick={() => eliminar(n.id)} className="-m-2 p-2 transition active:text-red-300">
                        Eliminar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
