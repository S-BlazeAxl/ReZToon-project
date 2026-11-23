import { supabase } from '../lib/supabase';

export type ReportType = 'comment' | 'chapter' | 'series' | 'user';
export type ReportSeverity = 'low' | 'medium' | 'high';
export type ReportStatus = 'open' | 'resolved' | 'rejected';

export interface Report {
  id: string;
  type: ReportType;
  targetId: string;
  targetLabel: string;
  reporterId: string;
  reporterName: string;
  reason: string;
  severity: ReportSeverity;
  status: ReportStatus;
  createdAt: string;
  resolvedBy?: string;
  resolvedAt?: string;
}

export async function getReports(): Promise<Report[]> {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error || !data) return [];

  return data.map(r => ({
    id: r.id,
    type: r.type as ReportType,
    targetId: r.target_id,
    targetLabel: r.target_label,
    reporterId: r.reporter_id,
    reporterName: r.reporter_name,
    reason: r.reason,
    severity: r.severity as ReportSeverity,
    status: r.status as ReportStatus,
    createdAt: r.created_at,
    resolvedBy: r.resolved_by ?? undefined,
    resolvedAt: r.resolved_at ?? undefined,
  }));
}

export async function addReport(
  reporter: { id: string; name: string },
  payload: Omit<Report, 'id' | 'createdAt' | 'status' | 'reporterId' | 'reporterName' | 'resolvedBy' | 'resolvedAt'>,
): Promise<Report | null> {
  const { data, error } = await supabase.from('reports').insert({
    type: payload.type,
    target_id: payload.targetId,
    target_label: payload.targetLabel,
    reporter_id: reporter.id,
    reporter_name: reporter.name,
    reason: payload.reason,
    severity: payload.severity,
  }).select().single();

  if (error || !data) return null;

  return {
    id: data.id,
    type: data.type as ReportType,
    targetId: data.target_id,
    targetLabel: data.target_label,
    reporterId: data.reporter_id,
    reporterName: data.reporter_name,
    reason: data.reason,
    severity: data.severity as ReportSeverity,
    status: data.status as ReportStatus,
    createdAt: data.created_at,
  };
}

export async function setReportStatus(id: string, status: ReportStatus): Promise<boolean> {
  const { error } = await supabase.from('reports').update({ status }).eq('id', id);
  return !error;
}