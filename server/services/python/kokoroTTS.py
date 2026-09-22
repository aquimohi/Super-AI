import sys
import os

def synthesize(text):
    try:
        # We attempt to import kokoro and torch.
        # This will fail if the user hasn't pip installed them yet,
        # which is expected on first run until they set it up.
        import torch
        from kokoro import KPipeline
        import soundfile as sf
        import io
        import numpy as np
    except ImportError as e:
        sys.stderr.write(f"Missing dependencies: {e}. Please run: pip install torch kokoro soundfile\n")
        sys.exit(1)

    try:
        # Initialize pipeline (uses 'a' for American English by default)
        pipeline = KPipeline(lang_code='a') 

        # Generate audio generator
        generator = pipeline(
            text, voice='af_heart', # deep cinematic voice
            speed=1, split_pattern=r'\n+'
        )

        audio_chunks = []
        for _, _, audio in generator:
            audio_chunks.append(audio)

        if not audio_chunks:
            sys.stderr.write("No audio generated.\n")
            sys.exit(1)

        final_audio = np.concatenate(audio_chunks)

        # Write to stdout as WAV bytes
        out_buf = io.BytesIO()
        sf.write(out_buf, final_audio, 24000, format='WAV', subtype='PCM_16')
        out_buf.seek(0)
        
        # Write binary to stdout securely
        sys.stdout.buffer.write(out_buf.read())
        sys.exit(0)

    except Exception as e:
        sys.stderr.write(f"Kokoro synthesis failed: {e}\n")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        text_input = sys.argv[1]
    else:
        text_input = sys.stdin.read()
        
    synthesize(text_input)
