export type Libro = {
  id: string
  tag_id: string
  titulo: string
  autor: string
  total_paginas: number
  total_capitulos: number
  pagina_actual: number
  capitulo_actual: number
}

export type Capitulo = {
  id: string
  libro_id: string
  numero: number
  titulo: string | null
}

export type Nota = {
  id: string
  libro_id: string
  capitulo_id: string
  pagina: number
  texto: string
  tipo: 'nota' | 'cita'
  created_at: string
}
