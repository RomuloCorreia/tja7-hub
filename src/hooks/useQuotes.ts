import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Quote } from '../types'

export function useQuotes() {
  const qc = useQueryClient()

  const quotesQuery = useQuery({
    queryKey: ['tja7_quotes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tja7_quotes')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Quote[]
    },
  })

  const createQuote = useMutation({
    mutationFn: async (quote: Partial<Quote>) => {
      const { data, error } = await supabase
        .from('tja7_quotes')
        .insert(quote)
        .select()
        .single()
      if (error) throw error
      return data as Quote
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tja7_quotes'] }),
  })

  const updateQuote = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Quote> & { id: string }) => {
      const { data, error } = await supabase
        .from('tja7_quotes')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Quote
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tja7_quotes'] }),
  })

  return {
    quotes: quotesQuery.data ?? [],
    isLoading: quotesQuery.isLoading,
    createQuote,
    updateQuote,
  }
}
