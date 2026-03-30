import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Client, ClientStage } from '../types'

export function useClients() {
  const qc = useQueryClient()

  const clientsQuery = useQuery({
    queryKey: ['tja7_clients'],
    queryFn: async () => {
      const all: Client[] = []
      let from = 0
      const pageSize = 1000
      while (true) {
        const { data, error } = await supabase
          .from('tja7_clients')
          .select('*')
          .order('created_at', { ascending: false })
          .range(from, from + pageSize - 1)
        if (error) throw error
        all.push(...(data as Client[]))
        if (!data || data.length < pageSize) break
        from += pageSize
      }
      return all
    },
  })

  const createClient = useMutation({
    mutationFn: async (client: Partial<Client>) => {
      const { data, error } = await supabase
        .from('tja7_clients')
        .insert(client)
        .select()
        .single()
      if (error) throw error
      return data as Client
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tja7_clients'] }),
  })

  const updateClient = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Client> & { id: string }) => {
      const { data, error } = await supabase
        .from('tja7_clients')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Client
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tja7_clients'] }),
  })

  const updateStage = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: ClientStage }) => {
      const updates: Record<string, unknown> = { stage, updated_at: new Date().toISOString() }
      if (stage === 'simulado') updates.last_contact_at = new Date().toISOString()
      const { error } = await supabase.from('tja7_clients').update(updates).eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, stage }) => {
      await qc.cancelQueries({ queryKey: ['tja7_clients'] })
      const prev = qc.getQueryData<Client[]>(['tja7_clients'])
      qc.setQueryData<Client[]>(['tja7_clients'], old =>
        old?.map(c => c.id === id ? { ...c, stage } : c) ?? []
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['tja7_clients'], ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['tja7_clients'] }),
  })

  const deleteClient = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tja7_clients').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tja7_clients'] }),
  })

  return {
    clients: clientsQuery.data ?? [],
    isLoading: clientsQuery.isLoading,
    error: clientsQuery.error,
    createClient,
    updateClient,
    updateStage,
    deleteClient,
  }
}
