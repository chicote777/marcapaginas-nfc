import { supabase } from '@/lib/supabase'
import type { Capitulo, Libro, Nota } from '@/lib/types'
import FormularioVinculacion from './FormularioVinculacion'
import Dashboard from './Dashboard'

// Siempre datos frescos: el progreso cambia constantemente
export const dynamic = 'force-dynamic'

export default async function PaginaLibro({
  params,
}: {
  params: Promise<{ tagId: string }>
}) {
  const { tagId: tagCrudo } = await params
  const tagId = decodeURIComponent(tagCrudo)

  const { data: libro } = await supabase
    .from('libros_nfc')
    .select('*')
    .eq('tag_id', tagId)
    .maybeSingle<Libro>()

  // Caso A · tarjeta nueva → formulario de vinculación
  if (!libro) return <FormularioVinculacion tagId={tagId} />

  // Caso B · tarjeta vinculada → dashboard del libro
  const [{ data: capitulos }, { data: notas }] = await Promise.all([
    supabase.from('capitulos').select('*').eq('libro_id', libro.id).order('numero'),
    supabase.from('notas').select('*').eq('libro_id', libro.id).order('pagina'),
  ])

  return (
    <Dashboard
      libro={libro}
      capitulos={(capitulos ?? []) as Capitulo[]}
      notas={(notas ?? []) as Nota[]}
    />
  )
}
