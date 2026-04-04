import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { ConstructionMaterial } from '../types'

export function useConstructionMaterials(constructionId?: string) {
  const qc = useQueryClient()

  const materialsQuery = useQuery({
    queryKey: ['tja7_construction_materials', constructionId],
    queryFn: async () => {
      let query = supabase
        .from('tja7_construction_materials')
        .select('*')
        .order('requested_at', { ascending: false })
      if (constructionId) query = query.eq('construction_id', constructionId)
      const { data, error } = await query
      if (error) throw error
      return data as ConstructionMaterial[]
    },
    enabled: !!constructionId,
  })

  const createMaterial = useMutation({
    mutationFn: async (material: Partial<ConstructionMaterial>) => {
      const { data, error } = await supabase
        .from('tja7_construction_materials')
        .insert(material)
        .select()
        .single()
      if (error) throw error
      return data as ConstructionMaterial
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tja7_construction_materials'] }),
  })

  const updateStatus = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ConstructionMaterial> & { id: string }) => {
      const { data, error } = await supabase
        .from('tja7_construction_materials')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as ConstructionMaterial
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tja7_construction_materials'] }),
  })

  return {
    materials: materialsQuery.data ?? [],
    isLoading: materialsQuery.isLoading,
    createMaterial,
    updateStatus,
  }
}
