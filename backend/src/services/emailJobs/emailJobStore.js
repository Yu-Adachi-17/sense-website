const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

const EMAIL_JOB_STAGE_PROGRESS = {
  uploading: 5,
  transcribing: 30,
  generating: 70,
  sendingMail: 90,
  completed: 100,
  failed: 100,
};

async function updateEmailJobStatus({
  jobId,
  userId,
  stage,
  status,
  error,
  errorCode,
  failedRecipients,
}) {
  if (!jobId) return;

  const docRef = db.collection('emailJobs').doc(jobId);

  const s = status || stage || 'unknown';
  const progress =
    EMAIL_JOB_STAGE_PROGRESS[s] !== undefined ? EMAIL_JOB_STAGE_PROGRESS[s] : null;

  const payload = {
    jobId,
    userId: userId || null,
    stage: stage || s,
    status: s,
    progress,
    error: error || null,
    errorCode: errorCode || null,
    failedRecipients: failedRecipients || [],
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  Object.keys(payload).forEach((k) => {
    if (payload[k] === null) delete payload[k];
  });

  await docRef.set(payload, { merge: true });
}

async function saveMeetingRecordFromEmailJob({
  uid,
  transcription,
  minutes,
  jobId,
}) {
  if (!uid) {
    console.log('[EMAIL_JOB] No uid, skip saving meetingRecords');
    return null;
  }

  const paperID = uuidv4();

  const recordData = {
    transcription: transcription || '',
    minutes: minutes || '',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    uid,
    paperID,
    jobId: jobId || null,
    source: 'minutes-email-from-audio',
  };

  const docRef = await db.collection('meetingRecords').add(recordData);

  console.log('[EMAIL_JOB] Saved meetingRecords docId=', docRef.id, 'paperID=', paperID);

  return {
    docId: docRef.id,
    paperID,
  };
}

function createEmailJobLogger(rawJobId) {
  const startedAt = Date.now();
  const jobId = rawJobId || `(no-jobId-${startedAt})`;

  console.log(`[EMAIL_JOB][${jobId}] >>> START at ${new Date(startedAt).toISOString()}`);

  return {
    mark(label) {
      const now = Date.now();
      const sec = ((now - startedAt) / 1000).toFixed(1);
      console.log(`[EMAIL_JOB][${jobId}] ${label} (+${sec}s, ${new Date(now).toISOString()})`);
    },
    end(status) {
      const endAt = Date.now();
      const sec = ((endAt - startedAt) / 1000).toFixed(1);
      console.log(
        `[EMAIL_JOB][${jobId}] <<< END status=${status} total=${sec}s at ${new Date(endAt).toISOString()}`
      );
    },
  };
}

module.exports = {
  updateEmailJobStatus,
  saveMeetingRecordFromEmailJob,
  createEmailJobLogger,
  db,
};
