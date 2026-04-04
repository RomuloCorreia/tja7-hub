import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { CrewMember } from '../types'

export function useConstructionCrew(constructionId?: string) {
  const qc = useQueryClient()

  const crewQuery = useQuery({
    queryKey: ['tja7_construction_crew', constructionId],
    queryFn: async () => {
      let query = supabase
        .from('tja7_construction_crew')
        .select('*')
        .order('created_at', { ascending: false })
      if (constructionId) query = query.eq('construction_id', constructionId)
      const { data, error } = await query
      if (error) throw error
      return data as CrewMember[]
    },
    enabled: !!constructionId,
  })

  const createMember = useMutation({
    mutationFn: async (member: Partial<CrewMember>) => {
      const { data, error } = await supabase
        .from('tja7_construction_crew')
        .insert(member)
        .select()
        .single()
      if (error) throw error
      return data as CrewMember
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tja7_construction_crew'] }),
  })

  const updateMember = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CrewMember> & { id: string }) => {
      const { data, error } = await supabase
        .from('tja7_construction_crew')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as CrewMember
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tja7_construction_crew'] }),
  })

  return {
    crew: crewQuery.data ?? [],
    isLoading: crewQuery.isLoading,
    createMember,
    updateMember,
  }
}
