import { supabase } from '../lib/supabase';

export type FeedbackStatus = 'new' | 'read' | 'resolved' | 'rejected';
export interface ContactFeedback {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: FeedbackStatus;
  supervisor_reply: string | null;
  created_at: string;
  updated_at: string;
}

export async function submitContactMessage(input: {
  name: string; email: string; subject: string; message: string;
}): Promise<string> {
  const { data, error } = await supabase.rpc('submit_contact_message', {
    p_name: input.name.trim(),
    p_email: input.email.trim().toLowerCase(),
    p_subject: input.subject.trim(),
    p_message: input.message.trim(),
  });
  if (error) throw error;
  if (!data) throw new Error('The contact submission did not return an ID.');
  return String(data);
}

export async function getContactFeedback(): Promise<ContactFeedback[]> {
  const { data, error } = await supabase.from('contact_messages').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ContactFeedback[];
}

export async function updateContactFeedback(id: string, patch: Pick<ContactFeedback, 'status' | 'supervisor_reply'>): Promise<void> {
  const { error } = await supabase.from('contact_messages').update({
    status: patch.status,
    supervisor_reply: patch.supervisor_reply?.trim() || null,
    updated_at: new Date().toISOString(),
  }).eq('id', id);
  if (error) throw error;
}
