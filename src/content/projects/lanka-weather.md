---
title: 'Lanka Weather'
tagline: 'floods, rivers and warnings on one map'
description: 'A flood and weather map for Sri Lanka that brings together river gauges, live rain, reservoirs, Google flood forecasts and DMC warnings, with push alerts that reach your phone about ten minutes after a warning is posted. Works in English, Sinhala and Tamil.'
tags: ['Go', 'PostGIS', 'PWA', 'Maps']
link: 'https://weather.prabhavalabs.com'
status: 'active'
featured: false
order: 2
image: '/images/projects/lanka-weather.jpg'
---

## The itch

Every time there's heavy rain in Sri Lanka, I do the same routine: open the
Irrigation Department's gauge dashboard, then the DMC website to find the
latest PDF, then a couple of community sites, and try to put it all together
in my head. The data is public, it's just spread across too many places, and
nobody wants to check five websites at night during a storm. It started as a
way to test Google's Flood Forecasting API, and it slowly turned into one map.

## How it works

A single Go worker reads 28 public feeds on their own schedules: about 40
Irrigation Department river gauges, around 290 live rain gauges, 142
reservoirs, Google's flood forecasts, the DMC's warnings straight from their
PDFs, and a few more. Everything goes into PostgreSQL with PostGIS, and every
reading keeps its source and its age, so the map tells you when something is
out of date instead of showing it as current.

On top of that, an estimate combines eight kinds of evidence per district and
only raises a level when two of them agree. Push alerts need no account. You
pick your areas and topics, and each notice says what happened, where, when
and who reported it. It installs as a PWA, works offline, and speaks English,
Sinhala and Tamil.

It isn't an official warning service. Anything marked "Estimate" is our own
calculation, and the DMC, the Department of Meteorology, NBRO and the
Irrigation Department always come first.

## Status

Live at [weather.prabhavalabs.com](https://weather.prabhavalabs.com). The full
engineering story is in [the case study](/blog/building-lanka-weather).
