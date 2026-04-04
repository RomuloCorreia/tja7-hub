import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { ConstructionCost } from '../types'

export function useConstructionCosts(constructionId?: string) {
  const qc = useQueryClient()

  const costsQuery = useQuery({
    queryKey: ['tja7_construction_costs', constructionId],
    queryFn: async () => {
      let query = supabase
        .from('tja7_construction_costs')
        .select('*')
        .order('created_at', { ascending: false })
      if (constructionId) query = query.eq('construction_id', constructionId)
      const { data, error } = await query
      if (error) throw error
      return data as ConstructionCost[]
    },
    enabled: !!constructionId,
  })

  const createCost = useMutation({
    mutationFn: async (cost: Partial<ConstructionCost>) => {
      const { data, error } = await supabase
        .from('tja7_construction_costs')
        .insert(cost)
        .select()
        .single()
      if (error) throw error
      return data as ConstructionCost
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tja7_construction_costs'] }),
  })

  const updateCost = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ConstructionCost> & { id: string }) => {
      const { data, error } = await supabase
        .from('tja7_construction_costs')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as ConstructionCost
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tja7_construction_costs'] }),
  })

  return {
    costs: costsQuery.data ?? [],
    isLoading: costsQuery.isLoading,
    createCost,
    updateCost,
  }
}
