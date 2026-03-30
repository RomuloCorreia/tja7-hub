import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Property } from '../types'

export function useProperties() {
  const qc = useQueryClient()

  const propertiesQuery = useQuery({
    queryKey: ['tja7_properties'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tja7_properties')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Property[]
    },
  })

  const createProperty = useMutation({
    mutationFn: async (prop: Partial<Property>) => {
      const { data, error } = await supabase
        .from('tja7_properties')
        .insert(prop)
        .select()
        .single()
      if (error) throw error
      return data as Property
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tja7_properties'] }),
  })

  const updateProperty = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Property> & { id: string }) => {
      const { data, error } = await supabase
        .from('tja7_properties')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Property
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tja7_properties'] }),
  })

  return {
    properties: propertiesQuery.data ?? [],
    isLoading: propertiesQuery.isLoading,
    createProperty,
    updateProperty,
  }
}
