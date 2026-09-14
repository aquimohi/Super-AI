import { VoiceSettings } from '../types';

let currentAudio: HTMLAudioElement | null = null;

export async function speakWithElevenLabs(
  text: string,
  settings?: VoiceSettings,
  onStart?: () => void,
  onEnd?: () => void
): Promise<boolean> {
  const apiKey = (import.meta as any).env.VITE_ELEVENLABS_API_KEY;
  if (!apiKey) return false;

  try {
    // ID for "Adam" (deep JARVIS-like voice)
    const voiceId = 'pNInz6ob8CkhJZZqVp-M';

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2_5', // fast + cheap model
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!response.ok) {
      console.warn('ElevenLabs API returned an error:', await response.text());
      return false; // Fall back to Web Speech API
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    
    // Cleanup previous audio if any
    if (currentAudio) {
      currentAudio.pause();
      URL.revokeObjectURL(currentAudio.src);
      currentAudio = null;
    }

    currentAudio = new Audio(url);
    
    if (settings && settings.voiceVolume !== undefined) {
      currentAudio.volume = Math.max(0, Math.min(1.0, settings.voiceVolume / 100));
    } else {
      currentAudio.volume = 0.85;
    }

    let hasEnded = false;
    const safeEnd = () => {
      if (!hasEnded) {
        hasEnded = true;
        if (onEnd) onEnd();
      }
    };

    currentAudio.onplay = () => {
      if (onStart) onStart();
    };
    
    currentAudio.onended = () => {
      safeEnd();
      URL.revokeObjectURL(url);
      currentAudio = null;
    };
    
    currentAudio.onerror = () => {
      safeEnd();
      URL.revokeObjectURL(url);
      currentAudio = null;
    };

    await currentAudio.play();
    return true;

  } catch (error) {
    console.error('ElevenLabs TTS failed:', error);
    return false;
  }
}

export function stopElevenLabsSpeech(): void {
  if (currentAudio) {
    currentAudio.pause();
    URL.revokeObjectURL(currentAudio.src);
    currentAudio = null;
  }
}

export function isElevenLabsSpeaking(): boolean {
  return currentAudio !== null && !currentAudio.paused;
}
