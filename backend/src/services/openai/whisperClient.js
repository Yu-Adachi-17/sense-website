const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

const OPENAI_API_ENDPOINT_TRANSCRIPTION =
  process.env.OPENAI_API_ENDPOINT_TRANSCRIPTION || 'https://api.openai.com/v1/audio/transcriptions';

function requireOpenAIKey() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error('OPENAI_API_KEY is not set.');
  }
  return key;
}

async function transcribeWithOpenAI(filePath) {
  const startedAt = Date.now();
  console.log(`[Whisper] START file=${filePath} at ${new Date(startedAt).toISOString()}`);

  try {
    const apiKey = requireOpenAIKey();

    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    formData.append('model', 'whisper-1');

    console.log(`[Whisper] Sending file to Whisper API: ${filePath}`);

    const response = await axios.post(
      OPENAI_API_ENDPOINT_TRANSCRIPTION,
      formData,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          ...formData.getHeaders(),
        },
        timeout: 600000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );

    const endedAt = Date.now();
    const sec = ((endedAt - startedAt) / 1000).toFixed(1);
    console.log(
      `[Whisper] DONE file=${filePath} elapsed=${sec}s, textLength=${response.data?.text?.length ?? 0}`
    );

    return response.data.text;
  } catch (error) {
    const endedAt = Date.now();
    const sec = ((endedAt - startedAt) / 1000).toFixed(1);
    console.error(
      `[Whisper] ERROR file=${filePath} elapsed=${sec}s:`,
      error.response?.data || error.message
    );
    throw new Error('Transcription with Whisper API failed');
  }
}

module.exports = {
  transcribeWithOpenAI,
  OPENAI_API_ENDPOINT_TRANSCRIPTION,
};
