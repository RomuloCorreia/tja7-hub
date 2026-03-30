import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Construction, ConstructionUpdate } from '../types'

export function useConstructions() {
  const qc = useQueryClient()

  const constructionsQuery = useQuery({
    queryKey: ['tja7_constructions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tja7_constructions')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Construction[]
    },
  })

  const createConstruction = useMutation({
    mutationFn: async (c: Partial<Construction>) => {
      const { data, error } = await supabase
        .from('tja7_constructions')
        .insert(c)
        .select()
        .single()
      if (error) throw error
      return data as Construction
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tja7_constructions'] }),
  })

  const updateConstruction = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Construction> & { id: string }) => {
      const { data, error } = await supabase
        .from('tja7_constructions')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Construction
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tja7_constructions'] }),
  })

  return {
    constructions: constructionsQuery.data ?? [],
    isLoading: constructionsQuery.isLoading,
    createConstruction,
    updateConstruction,
  }
}

export function useConstructionUpdates(constructionId?: string) {
  const qc = useQueryClient()

  const updatesQuery = useQuery({
    queryKey: ['tja7_construction_updates', constructionId],
    enabled: !!constructionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tja7_construction_updates')
        .select('*')
        .eq('construction_id', constructionId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as ConstructionUpdate[]
    },
  })

  const addUpdate = useMutation({
    mutationFn: async (u: Partial<ConstructionUpdate>) => {
      const { data, error } = await supabase
        .from('tja7_construction_updates')
        .insert(u)
        .select()
        .single()
      if (error) throw error
      return data as ConstructionUpdate
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tja7_construction_updates', constructionId] })
      qc.invalidateQueries({ queryKey: ['tja7_constructions'] })
    },
  })

  return {
    updates: updatesQuery.data ?? [],
    isLoading: updatesQuery.isLoading,
    addUpdate,
  }
}
