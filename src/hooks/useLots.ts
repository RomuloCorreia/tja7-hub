import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Lot } from '../types'

export function useLots() {
  const qc = useQueryClient()

  const lotsQuery = useQuery({
    queryKey: ['tja7_lots'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tja7_lots').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return data as Lot[]
    },
  })

  const createLot = useMutation({
    mutationFn: async (lot: Partial<Lot>) => {
      const { data, error } = await supabase.from('tja7_lots').insert(lot).select().single()
      if (error) throw error
      return data as Lot
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tja7_lots'] }),
  })

  const updateLot = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Lot> & { id: string }) => {
      const { data, error } = await supabase
        .from('tja7_lots')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Lot
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tja7_lots'] }),
  })

  return { lots: lotsQuery.data ?? [], isLoading: lotsQuery.isLoading, createLot, updateLot }
}
