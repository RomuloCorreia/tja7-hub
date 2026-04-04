import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Material } from '../types'

export function useMaterials() {
  const qc = useQueryClient()

  const materialsQuery = useQuery({
    queryKey: ['tja7_materials'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tja7_materials').select('*').order('name')
      if (error) throw error
      return data as Material[]
    },
  })

  const createMaterial = useMutation({
    mutationFn: async (m: Partial<Material>) => {
      const { data, error } = await supabase.from('tja7_materials').insert(m).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tja7_materials'] }),
  })

  const updateMaterial = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Material> & { id: string }) => {
      const { error } = await supabase.from('tja7_materials').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tja7_materials'] }),
  })

  return { materials: materialsQuery.data ?? [], isLoading: materialsQuery.isLoading, createMaterial, updateMaterial }
}
