import os
import subprocess
import tempfile
from pathlib import Path
import wave

async def synthesize(text: str) -> bytes:
    # Read env at call time to ensure values are available even if .env loads after module import
    PIPER_PATH = os.getenv("PIPER_PATH")
    PIPER_VOICE = os.getenv("PIPER_VOICE")

    if not PIPER_PATH or not PIPER_VOICE:
        raise RuntimeError("PIPER_PATH and PIPER_VOICE must be set in environment")

    # Prefer explicitly providing the accompanying JSON config if present (Windows reliability)
    voice_path = Path(PIPER_VOICE)
    json_guess = voice_path.with_suffix(voice_path.suffix + ".json")  # e.g., .onnx.json
    use_json = json_guess if json_guess.exists() else None

    # Run Piper in its own directory so it can find DLLs and espeak-ng-data (Windows)
    exe_path = Path(PIPER_PATH)
    exe_dir = exe_path.parent
    env = os.environ.copy()
    if "ESPEAK_DATA_PATH" not in env:
        data_dir = exe_dir / "espeak-ng-data"
        if data_dir.exists():
            env["ESPEAK_DATA_PATH"] = str(data_dir)

    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_out:
        out_path = tmp_out.name

    cmd = [PIPER_PATH, "-m", str(voice_path)]
    if use_json:
        cmd += ["-c", str(use_json)]
    cmd += ["-f", out_path]

    try:
        result = subprocess.run(
            cmd,
            check=True,
            capture_output=True,
            cwd=str(exe_dir),
            env=env,
            timeout=120,
            input=(text.strip() + "\n").encode("utf-8"),  # ensure newline-terminated stdin
        )

        # If Piper succeeded but produced an empty WAV, surface a helpful error
        try:
            if os.path.getsize(out_path) == 0:
                stdout = result.stdout.decode("utf-8", errors="ignore") if result.stdout else ""
                stderr = result.stderr.decode("utf-8", errors="ignore") if result.stderr else ""
                raise RuntimeError(
                    "Piper produced empty audio. Check that the voice .onnx and .onnx.json match, and try a simple ASCII sentence.\n"
                    f"stdout: {stdout}\nstderr: {stderr}"
                )
        except FileNotFoundError:
            raise RuntimeError("Piper did not create the output WAV file. Verify write permissions and paths.")

        # Validate WAV has frames (not just a header)
        try:
            with wave.open(out_path, "rb") as wf:
                frames = wf.getnframes()
        except Exception:
            frames = -1

        with open(out_path, "rb") as f:
            data = f.read()

        if frames <= 0:
            stdout = result.stdout.decode("utf-8", errors="ignore") if result.stdout else ""
            stderr = result.stderr.decode("utf-8", errors="ignore") if result.stderr else ""
            raise RuntimeError(
                "Piper returned a 0-second WAV. Try a simpler sentence (ASCII only) or verify espeak-ng-data is accessible.\n"
                f"stdout: {stdout}\nstderr: {stderr}"
            )
        try:
            os.remove(out_path)
        except Exception:
            pass
        return data
    except subprocess.CalledProcessError as e:
        # Improve error surface (stdout or stderr may be empty on Windows when a DLL is missing)
        stderr = e.stderr.decode("utf-8", errors="ignore") if e.stderr else ""
        stdout = e.stdout.decode("utf-8", errors="ignore") if e.stdout else ""
        msg = stderr or stdout or f"Piper exited with code {e.returncode}. Command: {' '.join(cmd)}"
        raise RuntimeError(msg)
    except subprocess.TimeoutExpired:
        raise RuntimeError(
            "Piper timed out after 60s. Ensure Piper.exe runs (not blocked) and DLLs/espeak-ng-data are present next to it."
        )
