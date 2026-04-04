import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { PurchaseOrderItem } from '../types'

export function usePurchaseOrderItems(orderId?: string) {
  const qc = useQueryClient()

  const itemsQuery = useQuery({
    queryKey: ['tja7_purchase_order_items', orderId],
    queryFn: async () => {
      let query = supabase
        .from('tja7_purchase_order_items')
        .select('*')
        .order('created_at', { ascending: false })
      if (orderId) query = query.eq('order_id', orderId)
      const { data, error } = await query
      if (error) throw error
      return data as PurchaseOrderItem[]
    },
    enabled: !!orderId,
  })

  const createItem = useMutation({
    mutationFn: async (item: Partial<PurchaseOrderItem>) => {
      const { data, error } = await supabase
        .from('tja7_purchase_order_items')
        .insert(item)
        .select()
        .single()
      if (error) throw error
      return data as PurchaseOrderItem
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tja7_purchase_order_items'] }),
  })

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tja7_purchase_order_items')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tja7_purchase_order_items'] }),
  })

  return {
    items: itemsQuery.data ?? [],
    isLoading: itemsQuery.isLoading,
    createItem,
    deleteItem,
  }
}
