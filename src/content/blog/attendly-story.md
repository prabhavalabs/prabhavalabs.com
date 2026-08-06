---
title: 'Attendly: an offline-first attendance system on a single Go binary'
description: 'How a tuition class of 100+ students runs attendance, billing, and door check-in on one Go process with embedded SQLite, and why the mobile app treats offline as the primary state.'
date: 2026-07-20
tags: ['case-study', 'attendly', 'golang']
lang: 'en'
---

Small tuition classes operate at an awkward scale: too many students to
track on paper, too few to justify commercial school software with
per-student pricing and features built for a principal's office. The gap
became concrete when a Reddit user described running a class with no
attendance system at all: paper lists, payment disputes with no records to
resolve them. Attendly was built for exactly this operating point: a
complete attendance, billing, and notification system for a class of 100+
students, open source, self-hosted on a single low-cost VPS.

<img src="/images/blog/attendly/admin-dashboard.png" alt="Attendly admin dashboard with attendance and revenue summaries" loading="lazy" decoding="async" />

*Figure 1: The admin dashboard, running on the demo dataset of 172 students.*

## Motivation

Before writing any code, three constraints shaped the design:

- **One operator.** The person deploying this is a teacher, not an
  infrastructure team. Every additional service is a liability.
- **The classroom door.** Peak load is not requests per second; it is
  eighty students arriving in a twenty-minute window, checked in by one
  person standing at a door with unreliable connectivity.
- **Money is the real dispute.** Attendance arguments in a tuition class
  are usually payment arguments: who attended which month, who paid, who
  is behind. Attendance without billing solves half the problem.

These constraints ruled out the default architecture (managed database,
separate services, cloud-only) before it was considered.

## Architecture

Attendly is a monorepo with three deployable pieces: a Go backend, a React
admin portal, and an Expo mobile app for door check-in.

The backend is a single Go process with SQLite embedded in-process. All
business logic lives there: students, sessions, role-based access control,
scheduled invoice generation, PDF receipts, and notifications. It deploys
as one Docker container behind nginx and Cloudflare, and GitHub Actions
redeploys it on every merge to main.

Embedding the database was the defining decision. There is no database
server, no connection pool, and no network hop between the application and
its data, so queries return in microseconds. The entire persistent state
of the class is one file on one disk; backing up the system is copying a
file. For this workload the trade-off is favorable: SQLite's single-writer
model is a real constraint, but a class of 100+ students produces write
volumes far below the point where it matters. Most systems are smaller
than their architecture.

<img src="/images/blog/attendly/admin-students.png" alt="Student roster with per-student attendance and billing status" loading="lazy" decoding="async" />

*Figure 2: The roster view. Each row joins attendance history with billing status.*

## The door check-in flow

The mobile app has one job: check students in at the door as fast as the
queue moves. A student presents a QR card and the camera decodes it, or
the operator searches a name. One tap marks present or late, and session
counts update live.

The controlling design decision is that offline is the primary state, not
an error state. Classroom connectivity fails routinely, and a queue of
students does not wait for a spinner. Check-ins are written to a local
queue first and synced when connectivity allows. The UI reports sync state
explicitly, with a manual sync control, so the operator always knows
whether the server has caught up. On reconnect, the API reconciles queued
marks against the scheduled session, opening it if check-ins arrive before
the session was formally started.

<img src="/images/blog/attendly/mobile-session.png" alt="Door check-in screen with QR scanning, manual lookup, and recent check-ins" loading="lazy" decoding="async" />

*Figure 3: The check-in screen: QR scanning, manual lookup, and sync status in one view.*

## Billing as a first-class subsystem

Sessions feed invoices; invoices track full and partial payments; a
defaulter view surfaces accounts in arrears before the conversation has to
happen at the door. Receipts render as PDFs from the same Go process, and
Cloudflare R2 stores uploads when configured. Keeping billing inside the
attendance system, rather than bolted on, is what turns attendance records
into evidence that settles disputes.

<img src="/images/blog/attendly/admin-billing.png" alt="Billing view with paid, partial, and unpaid invoices" loading="lazy" decoding="async" />

*Figure 4: Invoice states across the demo dataset: 182 paid, 84 partial, 78 unpaid.*

## Results

The demo seeder generates 172 students, four classes, 1,763 attendance
records, and a full billing history; every admin page renders without
perceptible latency on a shared 8-core VPS where Attendly's container
holds about 4 MB of resident memory at idle. The production instance runs
for a real class today, deployed automatically on merge.

Before the open-source release, the working tree and all 102 commits of
history were audited with gitleaks. The single finding was a fabricated
token in a PDF test fixture; no real credential was ever committed.

## Moving forward

Two lessons from this build apply beyond it. First, sizing architecture to
the actual workload, rather than to convention, removed entire categories
of operational work: there is no database server to patch, monitor, or
back up separately. Second, designing the mobile client around its worst
network case produced a better experience in every case; the sync-state UI
that exists for offline recovery turned out to be what operators check
most.

The system is MIT licensed at
[prabhavalabs/attendly](https://github.com/prabhavalabs/attendly), with a
five-minute local setup and the demo seeder used for every figure in this
post. Planned next steps are NFC card support at the door and a
parent-facing notification channel.
