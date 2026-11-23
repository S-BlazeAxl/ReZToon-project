import { supabase } from '../lib/supabase';
import type { Report } from './reportService';

export async function resolveReportWithAction(
  report: Report,
  action: 'resolve' | 'reject',
  moderatorId: string,
): Promise<{ success: boolean; message: string }> {
  try {
    if (action === 'resolve') {
      if (report.type === 'comment') {
        const tables = ['chapter_comments', 'post_comments'] as const;
        let deleted = false;
        for (const table of tables) {
          const { data, error } = await supabase
            .from(table)
            .delete()
            .eq('id', report.targetId)
            .select('id');
          if (error) {
            return { success: false, message: `Failed to delete comment: ${error.message}` };
          }
          if (data && data.length > 0) {
            deleted = true;
            break;
          }
        }
        if (!deleted) {
          return { success: false, message: 'Comment not found in chapter_comments or post_comments.' };
        }
      } else if (report.type === 'user') {
        const { error } = await supabase
          .from('profiles')
          .update({
            ban_until: new Date(Date.now() + 7 * 86400000).toISOString(),
            is_active: false,
          })
          .eq('id', report.targetId);
        if (error) {
          return { success: false, message: `Failed to ban user: ${error.message}` };
        }
      } else if (report.type === 'chapter') {
        const { error } = await supabase
          .from('chapters')
          .update({ status: 'draft', published_at: null })
          .eq('id', report.targetId);
        if (error) {
          return { success: false, message: `Failed to unpublish chapter: ${error.message}` };
        }
      } else if (report.type === 'series') {
        const { error } = await supabase
          .from('mangas')
          .update({ status: 'hiatus' })
          .eq('id', report.targetId);
        if (error) {
          return { success: false, message: `Failed to suspend series: ${error.message}` };
        }
      }
    }

    const { error: reportError } = await supabase
      .from('reports')
      .update({
        status: action === 'resolve' ? 'resolved' : 'rejected',
        resolved_by: moderatorId,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', report.id);

    if (reportError) {
      return { success: false, message: `Failed to update report: ${reportError.message}` };
    }

    return {
      success: true,
      message: action === 'resolve' ? 'Report resolved and action taken.' : 'Report rejected.',
    };
  } catch (err: any) {
    return { success: false, message: err.message || 'Unexpected error.' };
  }
}