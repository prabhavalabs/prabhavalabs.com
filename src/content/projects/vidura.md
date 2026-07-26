---
title: 'Vidura'
tagline: 'Learn from any English YouTube video — in Sinhala'
description: 'A mobile-first, installable PWA that overlays frame-accurate, LLM-translated Sinhala subtitles on YouTube videos — plus an AI chat assistant grounded in everything you have watched.'
tags: ['TypeScript', 'PWA', 'LLM', 'Self-hosted']
repo: 'https://github.com/prabhavalabs/vidura'
link: 'https://vidura.prabhavalabs.com'
status: 'active'
featured: false
order: 2
image: '/images/projects/vidura.jpg'
---

## The itch

The best educational content on YouTube — math, programming, science — is
overwhelmingly in English. For Sinhala speakers, that language barrier turns a
20-minute lesson into a struggle. YouTube's auto-translated captions come out
as word-salad, and paid dubbing services don't cover Sinhala at all.

Vidura's intention is simple: **make English educational video genuinely
watchable for Sinhala speakers**, with translations that read like something a
person would actually say — and timestamps accurate to the frame.

## How it works

Vidura fetches a video's own caption track (via yt-dlp), then translates the
whole transcript in a single structured-output LLM call with full video
context — so terminology stays consistent and sentences flow naturally across
subtitle lines. The synced result overlays the embedded player with VLC-style
subtitle controls.

Every video wears its provenance openly: where the timestamps came from, a
computed sync-quality score, and which model translated it.

## Beyond subtitles

- **Transcript-grounded chat** — ask questions about one video or your whole
  library; answers cite the video and timestamp
- **Timestamped notes** pinned to exact moments
- **Installable PWA** with offline shell, live processing progress over SSE,
  and web push when a video finishes
- **Self-hosted** — your library, notes, and chat history live on your server
- **Any target language** — Sinhala is the default, not the limit

## Status

Actively maintained. Source, setup guide, and screenshots on
[GitHub](https://github.com/prabhavalabs/vidura).
