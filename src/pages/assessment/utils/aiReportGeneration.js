import { createAIReport, getBackendLang } from '../../reports/utils/aiReportApi';
import { startAIReportWsJob } from '../../../services/aiReportWsClient';

function getTokenFromLocalStorage() {
  try {
    const raw = localStorage.getItem('user');
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.token || '';
  } catch {
    return '';
  }
}

export async function requestAIReportGeneration(
  assessmentId,
  { token = getTokenFromLocalStorage(), wsPath, assessmentType, title } = {}
) {
  if (!assessmentId) throw new Error('Missing assessmentId');
  if (!token) throw new Error('Missing token');

  const language = getBackendLang();
  console.log(`[requestAIReportGeneration] Starting for assessmentId: ${assessmentId}`);

  // 1. FIRST: Start WS connection (Subscription)
  // We start the WS first so we don't miss the first messages after the POST trigger
  const wsEndpoint = wsPath || `/ws/ai-report/${assessmentId}`;
  const jobMeta = {
    ...(assessmentType ? { assessmentType } : {}),
    ...(title ? { title } : {})
  };

  console.debug('[requestAIReportGeneration] Initiating WebSocket connection...');
  const wsJob = startAIReportWsJob({
    token,
    assessmentId,
    wsEndpoint,
    jobMeta
  });

  // 2. WAIT for WS connection (with a fallback)
  // Even if WS fails (e.g. SSL error on Vercel), we still want to trigger the POST
  try {
    console.debug('[requestAIReportGeneration] Waiting for WS to open...');
    // We give it a short time to try connecting
    await wsJob.connectionPromise;
    console.log('[requestAIReportGeneration] WebSocket connected successfully.');
  } catch (wsErr) {
    console.warn('[requestAIReportGeneration] WebSocket connection failed (likely SSL/WSS issue), but proceeding with POST:', wsErr);
    // Continue anyway - we don't want to block the report generation just because status tracking failed
  }

  // 3. SECOND: Trigger generation via POST
  let postRes;
  try {
    console.debug('[requestAIReportGeneration] Sending POST /api/AIReport...');
    postRes = await createAIReport(assessmentId, { token, language });
    console.log('[requestAIReportGeneration] POST success:', postRes);
    
    // Update job meta with the real job ID from backend
    if (postRes?.job_id && wsJob.updateJobId) {
        wsJob.updateJobId(postRes.job_id);
    }
    
    return { wsJob, res: postRes };
  } catch (err) {
    console.error('[requestAIReportGeneration] POST failed:', err);
    wsJob.close();
    throw err; 
  }
}
