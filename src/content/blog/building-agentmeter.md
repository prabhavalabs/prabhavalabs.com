---
title: 'Building AgentMeter: a physical usage display for coding agents'
description: 'How I turned a 2.16-inch ESP32 AMOLED into a live desk display for Codex, Claude, Gemini, and Cursor, then built the Bluetooth bridge and native macOS companion behind it.'
date: 2026-08-04
author: 'Nipun Theekshana'
tags: ['case-study', 'esp32', 'swiftui', 'bluetooth']
lang: 'en'
image: '/images/blog/agentmeter/agentmeter-desk-hero.jpg'
imageAlt: 'AgentMeter on a desk showing live Codex, Claude, and Cursor usage on its AMOLED screen'
imageWidth: 1350
imageHeight: 900
category: 'engineering'
---

I spend much of the day moving between coding tools. Codex might be working in
one repository while Claude Code helps with another, and Gemini or Cursor is
open somewhere else. Each service has its own quota windows and reset times.
The information exists, but it is buried in menus, terminal commands, and
account pages that I rarely remember to check until a limit is close.

I wanted that information to sit on my desk instead. A glance should answer
the practical questions: how much of the current window is left, when does it
reset, and is the number still live? That small idea became
[AgentMeter](https://github.com/prabhavalabs/agentmeter), an open-source ESP32
display with a native macOS companion.

The finished project collects local usage data for Codex, Claude, Gemini, and
Cursor, removes everything the display does not need, and sends a compact
snapshot over encrypted Bluetooth LE. The device presents responsive cards,
reset countdowns, provider details, alerts, and configurable layouts on a
480 by 480 AMOLED touchscreen. The Mac app manages the connection, keeps a
local history, and mirrors the device settings without competing for a second
Bluetooth connection.

## The idea and the boundaries

The physical concept came from
[Clawdmeter](https://github.com/HermannBjorgvin/Clawdmeter) and the
[Adafruit write-up about it](https://blog.adafruit.com/2026/05/12/making-a-claude-usage-display-with-clawdmeter/).
[CodexBar](https://github.com/steipete/CodexBar) showed a sensible way to read
several coding-agent limits locally. Those projects provided the spark, but I
wanted a broader and more maintainable system: several providers, a documented
protocol, a proper desktop controller, and clear privacy boundaries.

I also wanted this to remain a hobby build. No custom PCB, cloud account, or
separate radio module. The first version had to work with one readily available
board and one USB cable. When I found the Waveshare
ESP32-S3-Touch-AMOLED-2.16, the scope became realistic.

The unit cost EUR 39.35 when I ordered it from Amazon Germany. It already
contains the ESP32-S3, a 2.16-inch AMOLED, capacitive touch, Bluetooth, USB-C,
power management, 8 MB of PSRAM, 16 MB of flash, buttons, and an enclosure.
There are no jumper wires or breadboard in the first build. The same USB-C
cable flashes the firmware, carries serial diagnostics, and powers the unit on
the desk.

That convenience comes with one important detail: it is an integrated board,
not a generic Arduino plus a screen. The display controller, touch controller,
PSRAM mode, and pin map all had to match the exact Waveshare model. A generic
ESP32-S3 build profile could compile while quietly leaving the external memory
unavailable, which is enough to break the graphics buffers.

## What runs where

AgentMeter has three parts, each with a narrow job.

<img src="/images/blog/agentmeter/agentmeter-architecture.webp" alt="AgentMeter architecture showing Codex, Claude, Gemini, and Cursor flowing through CodexBar to the local bridge, macOS app, Bluetooth, USB, and ESP32 AMOLED display" width="1536" height="1024" />

*Figure 1: Provider usage stays on the Mac, passes through the local bridge, and reaches the ESP32 display over encrypted BLE or USB.*

The Mac owns provider authentication, collection, normalization, local history,
and the single Bluetooth connection. The ESP32 owns presentation, touch
navigation, local countdowns, alerts, and persistent display preferences. The
native app talks to the bridge through a private Unix socket, so opening the app
does not start another collector or another BLE session.

This boundary solved two problems at once. Provider credentials never need to
reach a hobby device, and the firmware stays provider-neutral. A new data source
can be added on the Mac without rewriting the screen model.

<img src="/images/blog/agentmeter/macos-overview-connected.png" alt="AgentMeter macOS overview with a connected device, a 24-hour usage graph, and provider cards" />

*Figure 2: The macOS overview joins live device state, local usage history, and current provider windows.*

## Collecting usage without leaving a trail of helpers

CodexBar supplies the local dashboard data, but I did not want AgentMeter to
keep provider helper processes alive all day. The bridge starts a short-lived
CodexBar server on the loopback interface only when a collection is due. It
generates a temporary 256-bit bearer token, fetches one versioned dashboard
document, validates it, and then stops the supervised process.

That lifecycle matters for Claude in particular. A background process may not
have the same browser-cookie access as an interactive app, so collection can
fall back to the Claude CLI. AgentMeter runs that passive probe in safe mode.
It can read authentication and usage without loading the user's hooks, plugins,
MCP servers, project instructions, or skills. Normal Claude sessions are left
alone.

Provider APIs also fail in ordinary ways. A value can disappear for one
refresh even though it was valid five minutes earlier. Showing zero would be
misleading, and showing an old value as live would be worse. The bridge keeps a
recent valid window for up to one hour and marks it as delayed. The device and
Mac app use separate live, stale, unavailable, reconnecting, and error states,
so a green label always means something concrete.

The normalized document is capped at 4096 bytes. It contains provider names,
quota labels, percentages, reset timestamps, display preferences, and short
event IDs. It excludes credentials, account identifiers, email addresses,
prompts, source code, file paths, repository names, raw provider responses,
costs, and billing details.

## Bluetooth was the difficult part

Getting one JSON document onto the screen over BLE was easy. Making that path
reliable across sleep, wake, device resets, forgotten bonds, and partial writes
took much longer.

The firmware advertises a private GATT service as a name such as
`AgentMeter-7405`. Snapshot, status, settings, and telemetry characteristics
require an encrypted bonded connection. Large documents are split into ordered
frames. The ESP32 reassembles them outside the BLE callback, rejects missing or
oversized fragments, validates the complete candidate model, and sends an ACK
only after parsing succeeds. The host retries the whole message up to three
times and reconnects after a link error.

That ACK rule is important. A successful characteristic write only proves that
bytes reached the Bluetooth stack. It does not prove that the firmware received
every fragment or accepted the JSON.

USB serial accepts the same newline-delimited snapshot format. It is a recovery
and diagnosis path, not a separate product mode. During board bring-up it let me
test the data model and UI before pairing was stable.

<div class="article-screenshot-grid">
  <figure>
    <img src="/images/blog/agentmeter/macos-device-discovery.png" alt="AgentMeter device discovery sheet scanning for compatible Bluetooth displays" />
    <figcaption>Figure 3: Discovery filters for compatible AgentMeter services and reports Bluetooth permission problems separately.</figcaption>
  </figure>
  <figure>
    <img src="/images/blog/agentmeter/macos-device-health.png" alt="Connected AgentMeter device page with Bluetooth signal, USB power, and firmware telemetry" />
    <figcaption>Figure 4: Once connected, the app reads honest device telemetry instead of guessing unsupported values.</figcaption>
  </figure>
</div>

The last sentence deserves emphasis. The AXP2101 power controller can confirm
USB presence and VBUS voltage, and it can report battery data when a battery is
actually attached. It cannot provide a trustworthy current-consumption number
through the interface used here. AgentMeter says "Unavailable" rather than
turning a configured current limit into a fake power measurement.

## Designing a useful 480 by 480 interface

A square screen is charming, but it leaves no room for careless layout. The
overview supports one to eight providers and changes its grid according to the
visible count. One provider gets a focused card. Two or three get more room.
Four use a balanced two by two layout, and larger sets remain scrollable.

Each provider has a recognizable mark and its own accent color. The cards show
the most relevant quota window, percentage, reset countdown, and data state.
Touching a card opens the detailed windows the provider actually reports. For
Claude that can include the current session, weekly usage, and model-specific
limits. The same data model works for Codex, Gemini, Cursor, and future
providers without hard-coding a special page for every service.

<div class="article-screenshot-grid">
  <figure>
    <img src="/images/blog/agentmeter/device-codex-detail.jpg" alt="Physical AgentMeter showing the Codex weekly usage detail view" />
    <figcaption>Figure 5: Codex detail with weekly usage and a local reset countdown.</figcaption>
  </figure>
  <figure>
    <img src="/images/blog/agentmeter/device-claude-detail.jpg" alt="Physical AgentMeter showing Claude session and weekly usage windows" />
    <figcaption>Figure 6: Claude can expose several windows with different reset schedules.</figcaption>
  </figure>
</div>

The display continues countdowns locally between host updates. That keeps the
screen feeling alive without sending a BLE message every second. When a quota
crosses a configured warning or critical threshold, the firmware wakes the
screen and shows one deduplicated alert rather than repeating it on every
refresh.

AMOLED behavior also shaped the interface. Brightness is moderate by default,
the screen can dim or turn off after inactivity, and the rendered content
shifts by one pixel over time. An always-on option is available for a powered
desk setup, but it is a deliberate setting rather than the default assumption.

## Settings had to move in both directions

Early versions treated the device as a passive screen. That stopped working as
soon as I added touch settings. If a provider was hidden on the device but
visible in the Mac app, which side was correct? If the desktop changed the
rotation interval while the ESP32 was offline, what happened after reconnect?

The answer is one revisioned settings model shared by both sides. Device changes
are reported back to the bridge. Desktop changes are sent as small patches and
acknowledged by the firmware. A stale revision is rejected instead of silently
overwriting a newer choice. The Mac UI updates the changed control in place,
which avoids refreshing the whole settings panel after every toggle.

<div class="article-screenshot-grid">
  <figure>
    <img src="/images/blog/agentmeter/device-agent-settings.jpg" alt="AgentMeter touchscreen settings for choosing which coding agents appear" />
    <figcaption>Figure 7: Provider visibility can be changed directly on the touchscreen.</figcaption>
  </figure>
  <figure>
    <img src="/images/blog/agentmeter/macos-display-settings.png" alt="AgentMeter macOS display settings with always-on mode, rotation, brightness, sleep, and alerts" />
    <figcaption>Figure 8: The same persistent settings are available from the Mac, with a live device preview.</figcaption>
  </figure>
</div>

## Why the Mac app became part of the project

The first host was a Python LaunchAgent. It worked, but it was invisible. There
was no friendly way to see whether the bridge was running, understand why BLE
had disconnected, choose a display, or change the screen without touching it.

The companion is a native Swift 6 and SwiftUI application with no third-party
Swift dependencies. It provides device discovery, signal and power telemetry,
provider visibility and order, synchronized display controls, local usage
history, and sanitized diagnostics. The history database retains bounded,
downsampled percentages for 30 days and can show the last 24 hours, 7 days,
30 days, or the current usage cycle. Gaps remain gaps; the graph does not invent
points while the bridge is offline.

The app follows the system appearance and also supports explicit light and dark
themes. Closing the main window removes the Dock icon while the status item and
background synchronization remain active. The process quits only when the user
chooses Quit AgentMeter from the menu bar.

<div class="article-screenshot-grid">
  <figure>
    <img src="/images/blog/agentmeter/macos-menu-bar.png" alt="AgentMeter menu bar panel with connection state, live provider percentages, navigation, and controls" />
    <figcaption>Figure 9: The compact menu-bar panel covers the checks I make most often.</figcaption>
  </figure>
  <figure>
    <img src="/images/blog/agentmeter/macos-menu-bar-codex-detail.png" alt="Expanded Codex details inside the AgentMeter menu bar panel" />
    <figcaption>Figure 10: Provider rows expand in place to show quota windows and model-specific details.</figcaption>
  </figure>
</div>

The menu-bar panel went through an unexpectedly large amount of refinement.
Its height must expand with provider details without collapsing into a thin
strip, its scroll area must remain usable without a heavy native scrollbar, and
the content has to use the narrow width efficiently. Those are small details,
but this is the surface that stays visible after the main window closes.

## Keeping the background work light

AgentMeter is supposed to be a quiet desk utility. A usage display that wastes
CPU or leaves a trail of provider processes would defeat its purpose.

The bridge therefore collects on demand, releases CodexBar and provider helpers
between intervals, bounds every message and history table, and publishes state
changes to the Swift app instead of making it poll. One process owns BLE. The
firmware uses fixed-size candidate models and two graphics buffers in external
PSRAM, then swaps a model into view only after full validation.

Diagnostics are similarly restrained. Logs rotate, the app receives sanitized
events, and hardware values are stored only when the board can measure them.
The diagnostics screen is useful for seeing connection transitions and export
health without becoming a second observability platform.

<img src="/images/blog/agentmeter/macos-diagnostics.png" alt="AgentMeter diagnostics page with bridge health, Bluetooth details, storage controls, and recent sanitized events" />

*Figure 11: Diagnostics expose enough context to debug the bridge while keeping provider data and credentials out.*

## Building and testing it in layers

The implementation was easier to reason about when each boundary became usable
before the next one was added.

I started with the repository structure, JSON schema, synthetic fixtures, and a
command-line host snapshot. Next came the exact Waveshare board profile,
display and touch bring-up, and USB serial rendering. BLE fragmentation and ACK
handling followed once the model was stable. The firmware UI came after that,
then background service management, the native app, bidirectional settings, and
release packaging.

Most states can be tested without signed-in provider accounts or physical
hardware. The host tests use fake CodexBar processes and transport backends.
The Swift app has a deterministic fake bridge with connected, disconnected,
pairing, unavailable-provider, legacy-device, and settings-conflict scenarios.
Native firmware tests cover parsing, reassembly, ACK encoding, rollover-safe
time calculations, and UI formatting before the ESP32 build is flashed.

The first physical unit also completed a 30-minute animated-display soak. It
produced 46,800 display flushes at an average of 527 microseconds, with free heap
remaining stable and no reset, watchdog, or firmware error. Automated checks
cannot judge touch feel, AMOLED color, enclosure temperature, or whether a
layout is pleasant at arm's length, so those stayed on the manual checklist.

## Building your own

For the supported first build, the physical list is short:

- Waveshare ESP32-S3-Touch-AMOLED-2.16, the ESP32-S3 2.16-inch model
- A data-capable USB-C cable
- A Bluetooth-capable Apple-silicon Mac running macOS 14 or later
- CodexBar configured for the providers you use

The [AgentMeter repository](https://github.com/prabhavalabs/agentmeter) contains
the firmware, Python bridge, native macOS app, versioned schemas, safe fixtures,
hardware guide, protocol documentation, and complete setup path. The macOS
community DMG is ad-hoc signed because this independent project does not use a
paid Apple Developer account. Its first launch therefore needs the documented
Gatekeeper approval in System Settings.

I would like to add a small adjustable stand, broaden host support beyond
macOS, and make the provider adapter boundary easier for contributors to extend.
Support for more ESP32 displays is possible, but I would rather add boards one
at a time with honest bring-up notes than claim compatibility from a matching
screen size.

The satisfying part of AgentMeter is not the percentage itself. It is taking a
piece of software activity that normally disappears inside account pages and
giving it a quiet physical presence. The display sits beside the keyboard,
updates without attention, and tells the truth when a source is late or a
connection is gone. That is exactly what I wanted from the first sketch.

AgentMeter is MIT licensed and built in the open by **Nipun Theekshana** under
[Prabhava Labs](https://github.com/prabhavalabs). Issues, build reports, and
focused contributions are welcome.
