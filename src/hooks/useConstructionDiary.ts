import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { DiaryEntry } from '../types'

export function useConstructionDiary(constructionId?: string) {
  const qc = useQueryClient()

  const diaryQuery = useQuery({
    queryKey: ['tja7_construction_diary', constructionId],
    queryFn: async () => {
      let query = supabase
        .from('tja7_construction_diary')
        .select('*')
        .order('date', { ascending: false })
      if (constructionId) query = query.eq('construction_id', constructionId)
      const { data, error } = await query
      if (error) throw error
      return data as DiaryEntry[]
    },
    enabled: !!constructionId,
  })

  const createEntry = useMutation({
    mutationFn: async (entry: Partial<DiaryEntry>) => {
      const { data, error } = await supabase
        .from('tja7_construction_diary')
        .insert(entry)
        .select()
        .single()
      if (error) throw error
      return data as DiaryEntry
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tja7_construction_diary'] }),
  })

  return {
    entries: diaryQuery.data ?? [],
    isLoading: diaryQuery.isLoading,
    createEntry,
  }
}
