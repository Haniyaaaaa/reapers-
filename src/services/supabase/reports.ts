import { supabase } from './client';
import type { ReportTarget } from './types';

export async function submitReport(reporterId: string, targetType: ReportTarget, targetId: string, reason: string): Promise<void> {
  const { error } = await supabase.from('reports').insert({ reporter_id: reporterId, target_type: targetType, target_id: targetId, reason });
  if (error) throw error;
}
