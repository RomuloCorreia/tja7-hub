import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { PurchaseOrder } from '../types'

export function usePurchaseOrders() {
  const qc = useQueryClient()

  const ordersQuery = useQuery({
    queryKey: ['tja7_purchase_orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tja7_purchase_orders')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as PurchaseOrder[]
    },
  })

  const createOrder = useMutation({
    mutationFn: async (order: Partial<PurchaseOrder>) => {
      const { data, error } = await supabase
        .from('tja7_purchase_orders')
        .insert(order)
        .select()
        .single()
      if (error) throw error
      return data as PurchaseOrder
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tja7_purchase_orders'] }),
  })

  const updateOrder = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PurchaseOrder> & { id: string }) => {
      const { data, error } = await supabase
        .from('tja7_purchase_orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as PurchaseOrder
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tja7_purchase_orders'] }),
  })

  return {
    orders: ordersQuery.data ?? [],
    isLoading: ordersQuery.isLoading,
    createOrder,
    updateOrder,
  }
}
