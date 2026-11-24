---
title: 'Lanka Weather: Building a Flood and Weather Map for Sri Lanka'
description: 'How a test of the Google Flood Forecasting API grew into one map of 28 public feeds, a flood risk estimate, and push alerts that reach a phone about ten minutes after the DMC posts a warning.'
date: 2026-11-24
author: 'Nipun Theekshana'
tags: ['case-study', 'go', 'postgis', 'pwa', 'web-push', 'floods']
lang: 'en'
image: '/images/blog/lanka-weather/lanka-weather-hero-900.webp'
imageAlt: 'Lanka Weather on a desktop browser, showing river risk, rain gauges and the Sri Lanka now summary on a dark map of Sri Lanka'
imageWidth: 900
imageHeight: 563
category: 'engineering'
relatedProject: 'lanka-weather'
---

There have been a lot of flash floods and heavy rain in Sri Lanka this season.
Every time it happens, I do the same routine. I open the Irrigation
Department's gauge dashboard, then the DMC website to find the latest PDF,
then a couple of community sites, and I try to put the whole picture together
in my head. It works, but it's slow, and when it's pouring at night it's the
last thing anyone wants to do.

So I built [Lanka Weather](https://weather.prabhavalabs.com). It's one map of
Sri Lanka with river levels, rain, reservoirs, Google's flood forecasts and the
official warnings on it. If you turn on alerts, it sends a notification to your
phone when something serious happens in the areas you pick. I'm sharing it
because maybe it helps someone a little.

<video src="/images/blog/lanka-weather/lanka-weather-phone-demo.mp4" poster="/images/blog/lanka-weather/phone-video-poster.webp" width="540" height="1174" controls muted playsinline preload="none" style="display:block;max-width:360px;width:100%;height:auto;margin:2em auto;"></video>

*Figure 1: A short screen recording from my phone: a reservoir, river risk estimates, a rain gauge, the layers panel, light mode, a station that has gone stale, and the official warnings list.*

One thing I want to say up front: please don't fully trust this. It's an
experiment, a fun project I built to learn, and some of what it shows is my own
estimate. If you're in danger, follow the DMC, the Department of Meteorology,
NBRO and the Irrigation Department, and call 117.

In this post I'll go through where the data comes from, how a small Go service
keeps 28 feeds up to date, how the alerts work, and the mistakes that made the
first alerts late.

## It started as a test of one API

Google has a Flood Forecasting API, the same data behind Google Flood Hub. I
mostly wanted to test it. Does it actually forecast floods in Sri Lanka, and if
it does, how early does it warn you?

You can't really judge a forecast without real readings next to it, so the
first thing I added was the Irrigation Department's river gauges. A river
forecast is hard to read without rain, so rain came next. After that I added
the DMC warnings, because those are what people actually act on, and then the
reservoirs, since a tank spilling upstream changes everything below it. By then
it had slowly turned into a proper map.

Along the way I noticed that most of this data is already public. It's just
spread across ArcGIS dashboards, PDFs, community sites and open GitHub
repositories, each with its own format and its own update rhythm. Nobody is
going to check all of that during a storm, so having it in one place felt
worth the effort.

## Where the data comes from

Right now the service reads 28 feeds. These are the main ones:

- Irrigation Department gauges, every 15 minutes: river level and rain at
  about 40 stations, with the department's alert, minor flood and major flood
  levels.
- [waterlevels.lk](https://waterlevels.lk), every 30 minutes to 6 hours: 142
  reservoirs, 22 extra river gauges and the Colombo canals.
- HMIS rain gauges, also through waterlevels.lk, every 10 minutes: rolling 24
  hour rain at around 290 live gauges run by NBRO, the Met Department, the
  Irrigation Department and ACCIMT.
- The DMC website, every 10 minutes: warnings, advisories and landslide
  reports, read straight from the PDFs.
- The Google Flood Forecasting API, hourly, with flash floods every 10 minutes:
  gauge forecasts, flash floods and flood areas.
- Open-Meteo, hourly and every 3 hours: current weather and a 9 day hourly
  forecast on a 0.2° grid.
- NOAA GFS, checked every 30 minutes: 10 m wind for the animated wind layer.
- GDACS and USGS, every 15 minutes to hourly: cyclones in the North Indian
  Ocean and earthquakes.
- [nuuuwan's data repositories](https://github.com/nuuuwan), every 20 minutes
  to weekly: administrative boundaries, the census, NBRO landslide levels and
  an index of DMC bulletins.

Every source has an entry in a data source catalogue in the repository, with
its licence, its terms and how to credit it. Before I add a new source, I write
down who runs it, what they allow and how often it really changes.

A couple of sources needed extra care. Google's terms say gauge results can't
be kept for more than a day, so anything older than 24 hours gets deleted and
is never served. Open-Meteo's free tier allows 10,000 calls a day and the
weather grid uses about 7,190 of them, so the schedule is planned around that
budget instead of "as often as possible". For GFS wind, the worker uses the
`.idx` inventory to download only the two wind messages it needs from each
file with HTTP range requests. That's about 1.9 MB per forecast hour instead
of the whole file.

## How it fits together

<img src="/images/blog/lanka-weather/architecture-overview.webp" alt="Isometric architecture diagram: official warnings, gauges and rain, and forecasts flow into a Go worker, which writes to PostgreSQL with PostGIS. An alert engine reads the database and sends through push services to a phone, and an API serves the PWA." width="1600" height="1047" loading="lazy" decoding="async" />

*Figure 2: One Go binary and one database. The worker collects, the alert engine decides, and the API serves the app.*

The diagram looks busy, but the idea is pretty simple. The back end is one Go
binary with a few sub-commands: `serve` for the API, `worker` for the
collectors and the alerts, `migrate`, and `collect`, which runs every collector
once. It uses `chi` for routing, `pgx` with `sqlc` for queries and `goose` for
migrations. PostgreSQL with PostGIS is the only datastore. I didn't need Redis
or a message queue.

### One collector per source

Each source is a small package that follows the same contract. Fetching and
decoding are kept apart, and decoding is pure: no network and no database
inside it. That means I can save a real response from a source and replay it in
the tests. And if the DMC changes a table on its website, the collector fails
loudly instead of quietly storing nothing.

All the collectors share one HTTP client. It sends an identifying User-Agent,
backs off after a 429 and sets a timeout on every request. When a run fails,
it's retried after 15 minutes, or later for the weekly geography collectors.

Only one worker collects at a time, because it holds a PostgreSQL advisory
lock. During a deploy I can have a second worker running and the two won't
both hit the same sources.

### Every row knows where it came from

Every stored record keeps the source, the time the source recorded or issued
it, and the time we fetched it. The layer catalogue gives each layer a refresh
cadence and a staleness limit. When a layer goes past its limit, the app says
it in plain words, for example "These model values are out of date", and fades
it on the map.

This part matters a lot. A river gauge that stopped reporting three hours
ago should never look calm on the map. So the rule in the code is that stale
data changes nothing, and the app never calls a place safe. The most it will
say is that no two sources point to flooding there right now.

<div class="article-screenshot-grid">
  <figure>
    <img src="/images/blog/lanka-weather/phone-stale-station.webp" alt="Galle weather station panel saying the newest Department of Meteorology reading is 13 days old and marked out of date" width="600" height="1304" loading="lazy" decoding="async" />
    <figcaption>Figure 3: When a source stops updating, the panel says so instead of showing an old reading as if it were current.</figcaption>
  </figure>
  <figure>
    <img src="/images/blog/lanka-weather/phone-river-gauge-light.webp" alt="Miriswatta river gauge on the Uruwal Oya in light mode, at 2.13 m and rising 0.45 m an hour, with a 72 hour chart and a note that the station publishes no flood thresholds" width="600" height="1304" loading="lazy" decoding="async" />
    <figcaption>Figure 4: A live river gauge, 32 minutes old, rising. This one has no official thresholds, and the app says that too.</figcaption>
  </figure>
</div>

### The app never calls a third party

When you open the map, your browser only talks to our API, and the API only
serves what the worker has already stored. The newest weather runs stay decoded
in memory, and the compact grid is gzipped once per run instead of on every
request. Each response has a `Cache-Control` header that matches how often its
source changes.

The only exceptions are public tile services that are meant to be used
directly: the OpenFreeMap basemap and NASA GIBS rain imagery.

## Turning many signals into one flood risk estimate

I didn't plan this part at the start. Once all the sources were in one
database, it made sense to combine them into a flood risk estimate for each
district.

Any one source on its own can mislead you. A gauge can spike for a few minutes,
a rain forecast can be off by a valley, and a Google flash flood polygon can
cover half a province. So each district is scored on eight families of
evidence, from 0 to 3 each:

- rain measured right now at the live gauges
- how wet the ground already is from the last 24 hours
- the rain forecast for the next 6 and 24 hours
- Google's flash flood forecast over the district
- Google's verified river forecasts in the district
- the Irrigation Department gauges in the district
- DMC and Met Department bulletins that name the district
- reservoirs that are spilling

A district only gets a level when two families agree. A single source already
has its own alert, so the estimate is there to confirm things and give some
lead time, not to repeat one reading. "High", for example, needs two families
with 4 points between them, and at least 2 from one of them.

I tuned the first thresholds against one real event. Replaying Colombo on 6
November with the gauge readings and Google flood areas I had stored, the
district reaches "high" at 14:00. That's when Google's morning forecast and a
45 mm downpour at Kesbewa agree, about four hours before the cloudburst. I'm
not sure yet how well these thresholds will hold up. One event is a very small
sample, and I'll need to check them again after every flood season.

The app always labels this as an estimate, and every notice that comes from it
says it isn't an official warning.

<div class="article-screenshot-grid">
  <figure>
    <img src="/images/blog/lanka-weather/phone-river-estimate.webp" alt="Deduru Oya panel marked Watch and Estimate, explaining that fairly heavy rain is forecast over the catchment and that this stretch has no gauge" width="600" height="1304" loading="lazy" decoding="async" />
    <figcaption>Figure 5: A river stretch at Watch. The panel explains why, and says plainly that there is no gauge on this stretch.</figcaption>
  </figure>
  <figure>
    <img src="/images/blog/lanka-weather/phone-flash-flood-7-nov.webp" alt="Lanka Weather on a phone on 7 November, with rivers and flood areas highlighted across the south-west of Sri Lanka" width="600" height="1304" loading="lazy" decoding="async" />
    <figcaption>Figure 6: The map on my phone on 7 November, the day after the Colombo downpour.</figcaption>
  </figure>
</div>

## What I learned about the Google Flood Forecasting API

For Sri Lanka, the API returns about 10 gauges that Google marks as quality
verified, and around 300 lower-confidence gauges on smaller rivers. I show
both, but the lower-confidence ones are clearly labelled.

The forecast models run roughly once a day. Flash flood alerts come more often,
a few times a day, so they have their own collector. It polls every 10 minutes
and logs how long after Google's issue time each alert first showed up. Flood
area polygons are large and don't change, so once one is stored it isn't
fetched again.

## The front end

The web app is React with Vite and MapLibre GL. Data fetching uses TanStack
Query, and its cache is saved to IndexedDB. So when you come back, the last
known state of every layer shows up straight away and then refreshes in the
background. Each layer's refresh interval comes from the same catalogue the API
serves, which means a cadence is defined in only one place.

The map itself is a stack of different layer types: vector tiles from our API
for the administrative regions, PMTiles for rivers, GeoJSON for stations and
warnings, a canvas image for the weather grid, raster tiles for the rain
imagery, and a WebGL custom layer for the animated wind. The wind decoder came
from TerraGuard, an earlier project of mine that already had a GRIB2 decoder
for GFS.

<div class="article-screenshot-grid">
  <figure>
    <img src="/images/blog/lanka-weather/mobile-2-map.webp" alt="Lanka Weather on a phone, showing the map of Sri Lanka with river gauges, reservoirs and rivers coloured by risk" width="600" height="1300" loading="lazy" decoding="async" />
    <figcaption>Figure 7: On a phone, the map takes the whole screen.</figcaption>
  </figure>
  <figure>
    <img src="/images/blog/lanka-weather/mobile-1-overview.webp" alt="The Sri Lanka now panel on a phone, summarising official warnings, river gauges at alert level, the river risk estimate and spilling reservoirs" width="600" height="1300" loading="lazy" decoding="async" />
    <figcaption>Figure 8: "Sri Lanka now" puts official warnings first and marks our estimates.</figcaption>
  </figure>
</div>

The whole interface works in English, Sinhala and Tamil, because a lot of
people here are more comfortable reading warnings in Sinhala or Tamil than in
English.

### An app without an app store

Lanka Weather is a Progressive Web App. A service worker built with Workbox
caches the app shell, about 3 MB including the Sinhala and Tamil fonts, so it
opens even with no connection. Map tiles and API responses have their own
caches with size limits, and only complete, successful responses are kept. A
"not collected yet" error never gets cached as if it were real data.

Updates wait until you tap Reload, so the app never reloads under someone who
is in the middle of reading a warning.

The PWA is also what makes alerts work on iPhones. Safari has supported Web
Push since iOS 16.4, but only for web apps added to the Home Screen, so the
install guide walks people through that step first.

## Push alerts without accounts

<img src="/images/blog/lanka-weather/warning-pipeline.webp" alt="Isometric pipeline diagram: the DMC website is polled every 10 minutes by the dmc-site collector, the new PDF is read, stored in PostgreSQL, picked up by the alert engine, matched and batched, sent through the push service and shown on the phone" width="1600" height="864" loading="lazy" decoding="async" />

*Figure 9: From a new PDF on the DMC website to a notification on your phone.*

There's no sign-up. A subscription is identified by its push endpoint, and the
browser's auth secret proves it's yours when you change your settings. The
server keeps the topics you picked, your areas and your language. If you choose
"near me", your location is rounded to about a kilometre before it's stored. We
don't keep a name, an email, a phone number or an IP address.

### The alert engine

The alert engine runs inside the worker, next to the collectors, every 30
seconds. It reads the same services the API uses: warnings, landslide levels,
gauges, Google's forecasts, cyclones, earthquakes, reservoirs and the flood
risk estimate. It gives each subject a level, and when a level goes higher than
the one it last alerted on, it stores an event.

Rivers tend to go up and down around their alert marks, so the engine uses
hysteresis. A subject stays at its alerted level until it has been below it for
hours. Without that, your phone would buzz ten times for the same river.

Each event is then matched to subscribers by topic, minimum severity and area,
grouped into one notice per kind, and capped at four notices an hour. Danger
level notices skip the cap. Every delivery is recorded for each event and
subscription, so nothing goes out twice, and when the push service answers 404
or 410, the dead subscription is deleted.

### Writing Web Push with the standard library

I wrote the Web Push code myself instead of using a library. The common Go
library uses deprecated `crypto/elliptic` calls and has a bug that turns a
`mailto:` subject into `mailto:mailto:`. Using `crypto/ecdh`, `crypto/hkdf` and
raw ECDSA keys from the standard library, RFC 8291 message encryption and RFC
8292 VAPID came to about 300 lines. The test compares the output byte for byte
with the worked example in RFC 8291's appendix, so I know the encryption
matches the spec exactly.

The push services in the middle, run by Google, Apple, Mozilla and Microsoft,
only ever see an encrypted payload.

### Saying what, where, when and who

My first notices were too vague. A notice that only says "Official warning ·
Sri Lanka" doesn't help anyone at 2 am. Now every notice names the place, the
reading, who issued it and when, in the language you use the app in:

> Minor flood · Nilwala Ganga at Panadugama
> Irrigation Department, reading at 17:15: Nilwala Ganga at Panadugama in
> Matara district is at minor flood level. Water level 7.5 m; threshold 7 m.

Some DMC flood warnings name a river basin but no districts. For those, the
service intersects the Irrigation Department's basin boundaries with the
districts in PostGIS and picks every district that holds at least 5% of the
basin. That way, "Flood Warning for Gin River Basin" reaches people in Galle and
Matara, and the notice says it was placed by basin.

The same templates render in English, Sinhala and Tamil, and a test checks that
every kind of notice renders completely in all three.

<div class="article-screenshot-grid">
  <figure>
    <img src="/images/blog/lanka-weather/mobile-3-alerts.webp" alt="Alert settings on a phone, with a button to turn on alerts, a choice between the whole country and chosen areas, and checkboxes for official warnings, landslide levels, river flood levels and heavy rain" width="600" height="1300" loading="lazy" decoding="async" />
    <figcaption>Figure 10: Alert settings. You pick the area and the kinds of alerts, and that's it.</figcaption>
  </figure>
</div>

## Why the first alerts were late

When I went through the alerts from the first half of November, DMC warnings
were reaching people 80 to 170 minutes after the DMC posted them. For a flash
flood, that's far too late.

I was reading the DMC bulletins from an open index that mirrors the DMC site.
It's a really good resource, but it only rebuilds about every two hours, and I
was reading it once an hour on top of that, so the two delays added up.

To fix it, I wrote a new collector that reads the first page of each of the
DMC's four report lists every 10 minutes. That's just four small HTML pages.
When a new warning, advisory, withdrawal or landslide report shows up, it
downloads the PDF, pulls the text out with `pdftotext` from poppler (installed
in the API image), and runs the same text rules to find the districts, the
colour and how long it's valid. Each row is stored under the same identifier
the index uses, so both sources fill the same row without duplicates. I checked
40 rows from the site against production, and every one matched.

Now warnings reach phones within about 10 minutes of the DMC posting them.

<div class="article-screenshot-grid">
  <figure>
    <img src="/images/blog/lanka-weather/phone-official-warnings.webp" alt="Official warnings panel listing a lightning advisory in force and the latest DMC bulletins, each with links to the official PDF and the DMC page" width="600" height="1304" loading="lazy" decoding="async" />
    <figcaption>Figure 11: Official warnings in the issuers' words, always with a link to the official PDF.</figcaption>
  </figure>
  <figure>
    <img src="/images/blog/lanka-weather/phone-rain-gauge.webp" alt="Gampaha Technical College rain gauge showing 114.5 mm in 24 hours, marked very heavy, with the rolling 24 hour chart" width="600" height="1304" loading="lazy" decoding="async" />
    <figcaption>Figure 12: A Met Department rain gauge at 114.5 mm in 24 hours. Readings like this feed the heavy rain alerts.</figcaption>
  </figure>
</div>

The second bug was harder to spot. I had added two new alert topics on the
server, heavy rain and flood risk, and switched them on for existing
subscribers with a migration. But the app sent its own saved list of topics
every time it opened, which removed the new ones again. People with alerts
turned on were missing heavy rain alerts without knowing it. Now the app
remembers which topics it has already shown you and adds any new defaults you
haven't seen, and another migration gave everyone their lost topics back.

## Deploying it

In production it's one Docker Compose project on a shared Ubuntu server,
behind the server's nginx. There are three containers: the API, the worker and
a small nginx that serves the built app and passes `/v1` and `/api` through to
the API. A `migrate` container runs on every start, and the API and the worker
wait for it. The database is the server's shared PostgreSQL, with PostGIS and
`pg_trgm` turned on for this app.

Deploying is one script. It packs up the commit, copies it to the server,
builds the images there and restarts everything. Because every stored row
comes from the collectors, the containers don't hold any state, and a brand new
database fills itself up within a few hours.

## Try it

You can use it at [weather.prabhavalabs.com](https://weather.prabhavalabs.com).

To get alerts on an iPhone (iOS 16.4 or later), open the site in Safari, tap
Share, then **Add to Home Screen**. Open Lanka Weather from the home screen,
tap the bell with the + at the top, then **Turn on alerts**, then **Allow**.
On Android, open it in Chrome, choose **Install app** from the menu, and turn
on alerts the same way.

Please use it as a second opinion, not as the source of truth. Some data
arrives late, some of it can be wrong, and anything marked "Estimate" is my own
calculation. Official warnings from the DMC, the Department of Meteorology,
NBRO and the Irrigation Department always come first.

## Thank you

This only works because a lot of people and organisations put their data out
in the open: the Irrigation Department, the DMC, the Department
of Meteorology, NBRO and the Mahaweli Authority; Google Flood Hub;
[waterlevels.lk](https://waterlevels.lk), for the reservoirs, the extra gauges
and the HMIS rain data; [nuuuwan](https://github.com/nuuuwan), whose open Sri
Lankan data repositories saved me weeks of work; and Open-Meteo, NOAA GFS,
GDACS, USGS, NASA GIBS and OpenStreetMap.

If you live near a river and the numbers on the map don't match what you're
seeing, please let me know. That kind of feedback helps me more than anything
else.

Lanka Weather is built by **Nipun Theekshana** under
[Prabhava Labs](https://github.com/prabhavalabs).
