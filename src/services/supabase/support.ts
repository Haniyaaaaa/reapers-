import { supabase } from './client';
import type { SupportTicketMessageRow, SupportTicketRow } from './types';

export async function listMyTickets(userId: string): Promise<SupportTicketRow[]> {
  const { data, error } = await supabase.from('support_tickets').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createTicket(userId: string, subject: string, firstMessage: string): Promise<SupportTicketRow> {
  const { data: ticket, error } = await supabase.from('support_tickets').insert({ user_id: userId, subject }).select().single();
  if (error) throw error;
  const { error: msgErr } = await supabase.from('support_ticket_messages').insert({ ticket_id: ticket.id, sender_id: userId, message: firstMessage });
  if (msgErr) throw msgErr;
  return ticket;
}

export async function getTicket(id: string): Promise<SupportTicketRow | null> {
  const { data, error } = await supabase.from('support_tickets').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function listMessages(ticketId: string): Promise<SupportTicketMessageRow[]> {
  const { data, error } = await supabase
    .from('support_ticket_messages')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at');
  if (error) throw error;
  return data ?? [];
}

export async function addMessage(ticketId: string, senderId: string, message: string): Promise<SupportTicketMessageRow> {
  const { data, error } = await supabase.from('support_ticket_messages').insert({ ticket_id: ticketId, sender_id: senderId, message }).select().single();
  if (error) throw error;
  return data;
}

export async function updateTicketStatus(id: string, status: SupportTicketRow['status']): Promise<void> {
  const { error } = await supabase.from('support_tickets').update({ status }).eq('id', id);
  if (error) throw error;
}
