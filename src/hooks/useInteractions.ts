import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Interaction } from '../types'

export function useInteractions(clientId?: string) {
  const qc = useQueryClient()

  const interactionsQuery = useQuery({
    queryKey: ['tja7_interactions', clientId],
    queryFn: async () => {
      let query = supabase
        .from('tja7_interactions')
        .select('*')
        .order('created_at', { ascending: false })
      if (clientId) query = query.eq('client_id', clientId)
      const { data, error } = await query
      if (error) throw error
      return data as Interaction[]
    },
  })

  const createInteraction = useMutation({
    mutationFn: async (interaction: Partial<Interaction>) => {
      const { data, error } = await supabase
        .from('tja7_interactions')
        .insert(interaction)
        .select()
        .single()
      if (error) throw error
      return data as Interaction
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tja7_interactions'] }),
  })

  return {
    interactions: interactionsQuery.data ?? [],
    isLoading: interactionsQuery.isLoading,
    createInteraction,
  }
}
