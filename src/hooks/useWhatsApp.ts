import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

// ============================================
// Types
// ============================================

export interface Conversation {
  id: string
  phone: string
  contact_name: string | null
  status: 'active' | 'paused' | 'transferred' | 'completed'
  ai_paused: boolean
  last_message_at: string | null
  last_inbound_at: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  // Joined
  last_message?: string
  unread_count?: number
  client?: {
    id: string
    name: string
    stage: string
    phone: string
  } | null
}

export interface WhatsAppMessage {
  id: string
  conversation_id: string
  client_id: string | null
  phone: string
  direction: 'inbound' | 'outbound'
  sender_type: 'lead' | 'ai_agent' | 'human' | 'system'
  content: string | null
  message_type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'sticker' | 'location'
  media_url: string | null
  media_mime_type: string | null
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
  uazapi_message_id: string | null
  metadata: Record<string, unknown>
  created_at: string
}

// ============================================
// useConversations
// ============================================

export function useConversations() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['tja7-conversations'],
    queryFn: async () => {
      // Buscar conversas
      const { data: conversations, error } = await supabase
        .from('tja7_whatsapp_conversations')
        .select('*')
        .order('last_message_at', { ascending: false })

      if (error) throw error

      // Para cada conversa, buscar última mensagem e cliente
      const enriched = await Promise.all(
        (conversations || []).map(async (conv) => {
          // Última mensagem
          const { data: lastMsg } = await supabase
            .from('tja7_whatsapp_messages')
            .select('content, direction, created_at')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          // Contagem de não lidas (inbound sem read após último outbound)
          const { count: unread } = await supabase
            .from('tja7_whatsapp_messages')
            .select('id', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('direction', 'inbound')
            .gte('created_at', conv.updated_at || conv.created_at)

          // Cliente vinculado
          const { data: client } = await supabase
            .from('tja7_clients')
            .select('id, name, stage, phone')
            .or(`phone.eq.${conv.phone},phone.ilike.%${conv.phone.slice(-11)}%`)
            .limit(1)
            .single()

          return {
            ...conv,
            last_message: lastMsg?.content || null,
            unread_count: unread || 0,
            client,
          } as Conversation
        })
      )

      return enriched
    },
    refetchInterval: 10000,
  })

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('tja7-conversations-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tja7_whatsapp_conversations' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['tja7-conversations'] })
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'tja7_whatsapp_messages' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['tja7-conversations'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  return query
}

// ============================================
// useMessages
// ============================================

export function useMessages(conversationId: string | null) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['tja7-messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return []
      const { data, error } = await supabase
        .from('tja7_whatsapp_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (error) throw error
      return (data || []) as WhatsAppMessage[]
    },
    enabled: !!conversationId,
    refetchInterval: 5000,
  })

  // Real-time para mensagens
  useEffect(() => {
    if (!conversationId) return

    const channel = supabase
      .channel(`tja7-messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tja7_whatsapp_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['tja7-messages', conversationId] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, queryClient])

  return query
}

// ============================================
// useSendMessage (manual)
// ============================================

export function useSendMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      conversationId,
      phone,
      text,
      clientId,
    }: {
      conversationId: string
      phone: string
      text: string
      clientId?: string | null
    }) => {
      // Enviar via edge function
      const { data, error } = await supabase.functions.invoke('uazapi-send-tja7', {
        body: { phone, text },
      })

      if (error) throw error

      // Salvar mensagem como humana
      await supabase.from('tja7_whatsapp_messages').insert({
        conversation_id: conversationId,
        client_id: clientId || null,
        phone,
        direction: 'outbound',
        sender_type: 'human',
        content: text,
        message_type: 'text',
        status: 'sent',
        uazapi_message_id: data?.messageId || null,
        metadata: { sent_by: 'manual' },
      })

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tja7-conversations'] })
      queryClient.invalidateQueries({ queryKey: ['tja7-messages'] })
    },
  })
}

// ============================================
// useToggleAI
// ============================================

export function useToggleAI() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      conversationId,
      paused,
    }: {
      conversationId: string
      paused: boolean
    }) => {
      const { error } = await supabase
        .from('tja7_whatsapp_conversations')
        .update({ ai_paused: paused, updated_at: new Date().toISOString() })
        .eq('id', conversationId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tja7-conversations'] })
    },
  })
}
