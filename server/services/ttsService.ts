/**
 * ttsService.ts
 * Multi-Engine TTS Factory (ElevenLabs, Edge-TTS, Kokoro)
 */
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type TTSEngine = 'elevenlabs' | 'edgetts' | 'kokoro';

/**
 * Strips out emojis, markdown, <think> tags, and any non-speakable characters.
 */
function sanitizeForSpeech(text: string): string {
  if (!text) return '';
  let s = text;
  // 1. Remove <think> blocks (DeepSeek R1 reasoning)
  s = s.replace(/<think>[\s\S]*?<\/think>/gi, '');
  // 2. Remove code blocks
  s = s.replace(/```[\s\S]*?```/g, ' Code omitted. ');
  // 3. Remove raw JSON blocks
  s = s.replace(/\{[\s\S]*?\}/g, ' ');
  // 4. Remove URLs
  s = s.replace(/https?:\/\/(?:www\.)?([a-zA-Z0-9-]+)(?:\.[a-zA-Z0-9-]+)*(?:\/[^\s]*)?/gi, '$1 link');
  // 5. Strip all characters that are NOT letters, numbers, spaces, or basic punctuation.
  // This removes ALL emojis, math symbols, markdown asterisks, hashes, etc.
  s = s.replace(/[^\p{L}\p{N}\s.,?!;:'"()\-]/gu, ' ');
  // 6. Cleanup extra whitespace
  s = s.replace(/\s+/g, ' ');
  return s.trim();
}

export async function generateSpeech(rawText: string, engineOverride?: TTSEngine): Promise<string | null> {
  const engine = engineOverride || (process.env.TTS_ENGINE as TTSEngine) || 'edgetts';
  const text = sanitizeForSpeech(rawText);

  if (!text) return null;

  try {
    if (engine === 'elevenlabs') {
      return await generateElevenLabs(text);
    } else if (engine === 'kokoro') {
      return await generateKokoro(text);
    } else {
      return await generateEdgeTTS(text);
    }
  } catch (error) {
    console.error(`[ttsService] Engine '${engine}' failed:`, error);
    // Fallback chain
    if (engine !== 'edgetts') {
      console.warn(`[ttsService] Falling back to Edge-TTS...`);
      return await generateEdgeTTS(text);
    }
    return null;
  }
}

// ---------------------------------------------------------------------------
// Engine 1: Edge-TTS (Free, fast cloud neural voice)
// ---------------------------------------------------------------------------
async function generateEdgeTTS(text: string): Promise<string | null> {
  const tts = new MsEdgeTTS();
  // Using Thomas, a highly natural, deep cinematic British male voice (Jarvis style)
  await tts.setMetadata('en-GB-ThomasNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  
  return new Promise((resolve, reject) => {
    let audioData: Buffer[] = [];
    const { audioStream } = tts.toStream(text);
    
    audioStream.on('data', (chunk) => {
      audioData.push(Buffer.from(chunk));
    });
    
    audioStream.on('end', () => {
      const finalBuffer = Buffer.concat(audioData);
      resolve(finalBuffer.toString('base64'));
    });
    
    audioStream.on('error', (err) => {
      reject(err);
    });
  });
}

// ---------------------------------------------------------------------------
// Engine 2: ElevenLabs (Premium cloud voice)
// ---------------------------------------------------------------------------
async function generateElevenLabs(text: string): Promise<string | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY || process.env.VITE_ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY is not set.');
  }

  const voiceId = 'pNInz6obpgDQGcFmaJgB'; // Adam

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_flash_v2_5', // upgraded to flash for ultra-fast latency
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer).toString('base64');
}

// ---------------------------------------------------------------------------
// Engine 3: Kokoro Python Bridge (Local AI offline)
// ---------------------------------------------------------------------------
async function generateKokoro(text: string): Promise<string | null> {
  // We bridge to a local python script `python/kokoroTTS.py`
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, 'python', 'kokoroTTS.py');
    const child = spawn('python', [pythonScript, text]);

    let audioData: Buffer[] = [];
    let errData = '';

    child.stdout.on('data', (chunk) => {
      audioData.push(Buffer.from(chunk));
    });

    child.stderr.on('data', (chunk) => {
      errData += chunk.toString();
    });

    child.on('close', (code) => {
      if (code !== 0) {
        console.error('[Kokoro] Error:', errData);
        reject(new Error(`Kokoro process exited with code ${code}`));
      } else {
        const finalBuffer = Buffer.concat(audioData);
        resolve(finalBuffer.toString('base64'));
      }
    });
    
    child.on('error', (err) => {
      reject(new Error(`Failed to start Kokoro python process: ${err.message}`));
    });
  });
}
