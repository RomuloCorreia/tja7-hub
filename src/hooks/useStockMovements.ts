import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { StockMovement } from '../types'

export function useStockMovements(materialId?: string) {
  const qc = useQueryClient()

  const movementsQuery = useQuery({
    queryKey: ['tja7_stock_movements', materialId],
    queryFn: async () => {
      let query = supabase
        .from('tja7_stock_movements')
        .select('*')
        .order('created_at', { ascending: false })
      if (materialId) query = query.eq('material_id', materialId)
      const { data, error } = await query
      if (error) throw error
      return data as StockMovement[]
    },
    enabled: !!materialId,
  })

  const createMovement = useMutation({
    mutationFn: async (movement: Partial<StockMovement>) => {
      const { data, error } = await supabase
        .from('tja7_stock_movements')
        .insert(movement)
        .select()
        .single()
      if (error) throw error
      return data as StockMovement
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tja7_stock_movements'] }),
  })

  return {
    movements: movementsQuery.data ?? [],
    isLoading: movementsQuery.isLoading,
    createMovement,
  }
}
