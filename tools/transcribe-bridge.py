#!/usr/bin/env python3
"""
Local transcription bridge for English Study Hub.

POST /transcribe
{
  "url": "https://www.youtube.com/watch?v=...",
  "language": "en"
}

Response:
{
  "url": "...",
  "title": "...",
  "siteName": "...",
  "text": "...",
  "source": "openai|whisper-cli"
}
"""

from __future__ import annotations

import argparse
import glob
import json
import os
import shutil
import subprocess
import tempfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any, Dict, List, Tuple
from urllib.parse import urlparse


def command_exists(name: str) -> bool:
  return shutil.which(name) is not None


def run_cmd(cmd: List[str], timeout: int = 900) -> str:
  proc = subprocess.run(
    cmd,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    timeout=timeout,
  )
  if proc.returncode != 0:
    message = (proc.stderr or proc.stdout or '').strip()
    raise RuntimeError(f'Command failed: {" ".join(cmd)}\n{message[:600]}')
  return (proc.stdout or '').strip()


def ensure_prerequisites() -> None:
  if not command_exists('yt-dlp'):
    raise RuntimeError('Missing `yt-dlp`. Install: brew install yt-dlp')
  if not command_exists('ffmpeg'):
    raise RuntimeError('Missing `ffmpeg`. Install: brew install ffmpeg')


def fetch_video_meta(url: str) -> Dict[str, str]:
  try:
    out = run_cmd(['yt-dlp', '--dump-single-json', '--skip-download', url], timeout=180)
    data = json.loads(out)
  except Exception:
    host = urlparse(url).hostname or 'video'
    return {'title': url, 'siteName': host}

  title = data.get('title') or url
  uploader = data.get('uploader') or data.get('channel') or data.get('uploader_id')
  host = urlparse(url).hostname or 'video'
  return {'title': title, 'siteName': uploader or host}


def download_audio(url: str, workdir: str) -> str:
  output_tpl = os.path.join(workdir, 'audio.%(ext)s')
  run_cmd(
    [
      'yt-dlp',
      '-f',
      'bestaudio/best',
      '-x',
      '--audio-format',
      'mp3',
      '--audio-quality',
      '0',
      '-o',
      output_tpl,
      url,
    ],
    timeout=1800,
  )

  files = sorted(glob.glob(os.path.join(workdir, 'audio.*')))
  if not files:
    raise RuntimeError('Failed to download audio track.')
  return files[0]


def transcribe_with_openai(audio_path: str, language: str) -> str:
  api_key = os.getenv('OPENAI_API_KEY', '').strip()
  if not api_key:
    raise RuntimeError('OPENAI_API_KEY not set.')

  model = os.getenv('OPENAI_TRANSCRIBE_MODEL', 'gpt-4o-mini-transcribe').strip() or 'gpt-4o-mini-transcribe'
  cmd = [
    'curl',
    '-sS',
    'https://api.openai.com/v1/audio/transcriptions',
    '-H',
    f'Authorization: Bearer {api_key}',
    '-F',
    f'file=@{audio_path}',
    '-F',
    f'model={model}',
    '-F',
    'response_format=json',
  ]
  if language:
    cmd.extend(['-F', f'language={language}'])

  out = run_cmd(cmd, timeout=1800)
  payload = json.loads(out)
  if isinstance(payload, dict) and payload.get('error'):
    msg = payload['error'].get('message') if isinstance(payload.get('error'), dict) else str(payload['error'])
    raise RuntimeError(f'OpenAI transcription failed: {msg}')

  text = (payload.get('text') or '').strip() if isinstance(payload, dict) else ''
  if not text:
    raise RuntimeError('OpenAI transcription returned empty text.')
  return text


def transcribe_with_whisper_cli(audio_path: str, language: str, workdir: str) -> str:
  if not command_exists('whisper'):
    raise RuntimeError('Missing local whisper CLI. Install: pip install openai-whisper')

  model = os.getenv('WHISPER_MODEL', 'base').strip() or 'base'
  cmd = [
    'whisper',
    audio_path,
    '--model',
    model,
    '--task',
    'transcribe',
    '--output_format',
    'json',
    '--output_dir',
    workdir,
    '--fp16',
    'False',
  ]
  if language:
    cmd.extend(['--language', language])

  run_cmd(cmd, timeout=3600)
  stem = os.path.splitext(os.path.basename(audio_path))[0]
  json_path = os.path.join(workdir, f'{stem}.json')
  if not os.path.exists(json_path):
    files = sorted(glob.glob(os.path.join(workdir, '*.json')))
    if not files:
      raise RuntimeError('whisper CLI output not found.')
    json_path = files[0]

  with open(json_path, 'r', encoding='utf-8') as f:
    payload = json.load(f)

  text = (payload.get('text') or '').strip() if isinstance(payload, dict) else ''
  if not text and isinstance(payload, dict) and isinstance(payload.get('segments'), list):
    text = ' '.join((seg.get('text') or '').strip() for seg in payload['segments']).strip()

  if not text:
    raise RuntimeError('whisper CLI returned empty text.')
  return text


def transcribe_url(url: str, language: str) -> Tuple[str, Dict[str, str], str]:
  ensure_prerequisites()
  meta = fetch_video_meta(url)

  with tempfile.TemporaryDirectory(prefix='readingtool-transcribe-') as workdir:
    audio_path = download_audio(url, workdir)

    api_key = os.getenv('OPENAI_API_KEY', '').strip()
    if api_key:
      try:
        text = transcribe_with_openai(audio_path, language)
        return text, meta, 'openai'
      except Exception:
        # Fallback to local whisper if available.
        if not command_exists('whisper'):
          raise

    text = transcribe_with_whisper_cli(audio_path, language, workdir)
    return text, meta, 'whisper-cli'


class TranscribeHandler(BaseHTTPRequestHandler):
  server_version = 'ReadingToolTranscribeBridge/1.0'

  def _set_cors(self) -> None:
    self.send_header('Access-Control-Allow-Origin', '*')
    self.send_header('Access-Control-Allow-Headers', 'Content-Type')
    self.send_header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')

  def _send_json(self, code: int, payload: Dict[str, Any]) -> None:
    body = json.dumps(payload, ensure_ascii=False).encode('utf-8')
    self.send_response(code)
    self._set_cors()
    self.send_header('Content-Type', 'application/json; charset=utf-8')
    self.send_header('Content-Length', str(len(body)))
    self.end_headers()
    self.wfile.write(body)

  def do_OPTIONS(self) -> None:  # noqa: N802
    self.send_response(204)
    self._set_cors()
    self.end_headers()

  def do_GET(self) -> None:  # noqa: N802
    if self.path.startswith('/health'):
      self._send_json(
        200,
        {
          'ok': True,
          'ytDlp': command_exists('yt-dlp'),
          'ffmpeg': command_exists('ffmpeg'),
          'whisperCli': command_exists('whisper'),
          'openaiConfigured': bool(os.getenv('OPENAI_API_KEY', '').strip()),
          'now': __import__('datetime').datetime.utcnow().isoformat() + 'Z',
        },
      )
      return
    self._send_json(404, {'error': 'Not Found', 'routes': ['GET /health', 'POST /transcribe']})

  def do_POST(self) -> None:  # noqa: N802
    if not self.path.startswith('/transcribe'):
      self._send_json(404, {'error': 'Not Found'})
      return

    try:
      length = int(self.headers.get('Content-Length') or '0')
      raw = self.rfile.read(length).decode('utf-8') if length else '{}'
      payload = json.loads(raw or '{}')
      url = str(payload.get('url') or '').strip()
      language = str(payload.get('language') or '').strip() or 'en'

      if not url or not url.startswith(('http://', 'https://')):
        self._send_json(400, {'error': 'Body must include a valid http/https url'})
        return

      text, meta, source = transcribe_url(url, language)
      self._send_json(
        200,
        {
          'url': url,
          'title': meta.get('title') or url,
          'siteName': f"{meta.get('siteName') or 'video'} · 自动转写",
          'text': text,
          'source': source,
        },
      )
    except Exception as err:
      self._send_json(500, {'error': str(err)})


def parse_args() -> argparse.Namespace:
  parser = argparse.ArgumentParser(description='Local transcription bridge for readingtool')
  parser.add_argument('--host', default=os.getenv('HOST', '127.0.0.1'))
  parser.add_argument('--port', type=int, default=int(os.getenv('PORT', '8790')))
  return parser.parse_args()


def main() -> None:
  args = parse_args()
  server = ThreadingHTTPServer((args.host, args.port), TranscribeHandler)
  print(f'[transcribe-bridge] listening on http://{args.host}:{args.port}')
  print(f'[transcribe-bridge] health: http://{args.host}:{args.port}/health')
  print(f'[transcribe-bridge] transcribe: http://{args.host}:{args.port}/transcribe')
  server.serve_forever()


if __name__ == '__main__':
  main()
