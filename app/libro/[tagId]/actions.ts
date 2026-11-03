'use server'

import { revalidatePath } from 'next/cache'
import { supabase } from '@/lib/supabase'
import type { Nota } from '@/lib/types'

type Resultado = { error?: string }

export async function crearLibro(
  tagId: string,
  datos: { titulo: string; autor: string; totalPaginas: number; totalCapitulos: number }
): Promise<Resultado> {
  const titulo = datos.titulo.trim()
  const autor = datos.autor.trim()
  const { totalPaginas, totalCapitulos } = datos

  if (!titulo || !autor) return { error: 'Escribe el título y el autor.' }
  if (!Number.isInteger(totalPaginas) || totalPaginas < 1)
    return { error: 'El total de páginas debe ser un número mayor que 0.' }
  if (!Number.isInteger(totalCapitulos) || totalCapitulos < 1 || totalCapitulos > 200)
    return { error: 'Los capítulos deben estar entre 1 y 200.' }

  // Insertamos especificando explicitamente pagina_actual y capitulo_actual
  const { data: libro, error } = await supabase
    .from('libros_nfc')
    .insert({
      tag_id: tagId,
      titulo,
      autor,
      total_paginas: totalPaginas,
      total_capitulos: totalCapitulos,
      pagina_actual: 1,
      capitulo_actual: 1,
    })
    .select('id')
    .single()

  if (error || !libro) {
    // 🔍 Imprimimos el error en la consola de PowerShell para ver la causa real si vuelve a fallar
    console.error('Error detallado de Supabase:', error)

    return {
      error: error?.code === '23505'
        ? 'Esta tarjeta ya tiene un libro vinculado.'
        : `No se pudo guardar el libro (${error?.message || 'Error de conexión'}).`,
    }
  }

  const capitulos = Array.from({ length: totalCapitulos }, (_, i) => ({
    libro_id: libro.id,
    numero: i + 1,
  }))
  
  const { error: errCaps } = await supabase.from('capitulos').insert(capitulos)
  
  if (errCaps) {
    console.error('Error al insertar capítulos:', errCaps)
    await supabase.from('libros_nfc').delete().eq('id', libro.id)
    return { error: 'No se pudieron crear los capítulos. Inténtalo de nuevo.' }
  }

  // Notificar a Next.js para invalidar la caché de la ruta
  revalidatePath(`/libro/${tagId}`)

  return {}
}

export async function actualizarProgreso(
  libroId: string,
  pagina: number,
  capitulo: number
): Promise<Resultado> {
  const { error } = await supabase
    .from('libros_nfc')
    .update({ pagina_actual: pagina, capitulo_actual: capitulo })
    .eq('id', libroId)

  return error ? { error: 'No se pudo guardar el progreso.' } : {}
}

export async function anadirNota(datos: {
  libroId: string
  capituloId: string
  pagina: number
  texto: string
  tipo: 'nota' | 'cita'
}): Promise<Resultado & { nota?: Nota }> {
  const { data, error } = await supabase
    .from('notas')
    .insert({
      libro_id: datos.libroId,
      capitulo_id: datos.capituloId,
      pagina: datos.pagina,
      texto: datos.texto,
      tipo: datos.tipo,
    })
    .select('*')
    .single()

  if (error || !data) return { error: 'No se pudo guardar la anotación.' }
  return { nota: data as Nota }
}

export async function borrarNota(notaId: string): Promise<Resultado> {
  // Corrección: .eq('id', notaId) en lugar de .eq('eq', notaId)
  const { error } = await supabase.from('notas').delete().eq('id', notaId)
  return error ? { error: 'No se pudo eliminar la anotación.' } : {}
}