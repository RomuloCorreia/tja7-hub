import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Simulation } from '../types'

export function useSimulations(clientId?: string) {
  const qc = useQueryClient()

  const simulationsQuery = useQuery({
    queryKey: ['tja7_simulations', clientId],
    queryFn: async () => {
      let query = supabase
        .from('tja7_simulations')
        .select('*')
        .order('created_at', { ascending: false })
      if (clientId) query = query.eq('client_id', clientId)
      const { data, error } = await query
      if (error) throw error
      return data as Simulation[]
    },
  })

  const createSimulation = useMutation({
    mutationFn: async (sim: Partial<Simulation>) => {
      const { data, error } = await supabase
        .from('tja7_simulations')
        .insert(sim)
        .select()
        .single()
      if (error) throw error
      return data as Simulation
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tja7_simulations'] }),
  })

  return {
    simulations: simulationsQuery.data ?? [],
    isLoading: simulationsQuery.isLoading,
    createSimulation,
  }
}
