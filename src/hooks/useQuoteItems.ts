import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { QuoteItem } from '../types'

export function useQuoteItems(quoteId?: string) {
  const qc = useQueryClient()

  const itemsQuery = useQuery({
    queryKey: ['tja7_quote_items', quoteId],
    queryFn: async () => {
      let query = supabase
        .from('tja7_quote_items')
        .select('*')
        .order('created_at', { ascending: false })
      if (quoteId) query = query.eq('quote_id', quoteId)
      const { data, error } = await query
      if (error) throw error
      return data as QuoteItem[]
    },
    enabled: !!quoteId,
  })

  const createItem = useMutation({
    mutationFn: async (item: Partial<QuoteItem>) => {
      const { data, error } = await supabase
        .from('tja7_quote_items')
        .insert(item)
        .select()
        .single()
      if (error) throw error
      return data as QuoteItem
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tja7_quote_items'] }),
  })

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tja7_quote_items')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tja7_quote_items'] }),
  })

  return {
    items: itemsQuery.data ?? [],
    isLoading: itemsQuery.isLoading,
    createItem,
    deleteItem,
  }
}
