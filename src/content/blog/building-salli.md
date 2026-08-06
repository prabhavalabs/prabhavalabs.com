---
title: 'Building Salli: a private money tracker that learns from bank SMS'
description: 'An engineering account of Salli, from brittle regular expressions to a conservative on-device classifier, encrypted local state, background Android capture, and a review loop designed to earn trust.'
date: 2026-07-26
tags: ['flutter', 'on-device ML', 'privacy', 'android']
image: '/images/blog/salli/salli-engineering-cover.webp'
imageAlt: 'A private glass ledger turns an incoming emerald message signal into an ordered row of warm ledger entries'
imageWidth: 1672
imageHeight: 941
category: 'engineering'
series: 'Salli'
seriesOrder: 1
relatedProject: 'salli'
---

I started Salli with a familiar frustration: I could tell you what was in my
bank account, but not what I could safely spend that day.

A balance is a snapshot. It does not know that rent is due next week, that a
subscription is about to renew, or that payday is still nine days away.
Traditional expense trackers can answer those questions, but only after every
coffee, bus fare, and bill has been entered. That habit rarely survives a busy
month.

Sri Lankan banks already send a useful event stream to Android phones. Every
card purchase, transfer, and account credit tends to leave an SMS behind. Salli
turns that stream into an editable local ledger, then uses the ledger to
calculate budgets, recurring payments, accounts, and the distance to payday.

The difficult part was never drawing a chart. It was deciding when a message
was safe to treat as financial evidence.

## The product constraint came first

Salli is local-first and has no account system. The transaction database is
encrypted with SQLCipher. Its key lives in the device keystore through secure
storage. SMS bodies, account suffixes, categories, corrections, and receipt
text stay on the phone.

That choice removes a convenient engineering escape hatch. I could not send
every strange message to a hosted language model and wait for a plausible
JSON response. The pipeline had to be small enough to ship in the application,
fast enough for a modest Android phone, and cautious enough that an OTP could
never become a grocery purchase.

I settled on one product rule that now shapes the code:

> A missed transaction is annoying. A transaction invented from an OTP or a
> declined payment destroys trust.

The app therefore saves new SMS transactions for review rather than silently
confirming them.

## What the user actually sees

The home screen centres on Safe to Spend. The calculation starts with expected
income, subtracts savings reserves and committed spending, accounts for what
has already been spent, and divides the usable pool across the remaining days
in the payday cycle. Users can change those inputs instead of accepting a
black-box score.

Transactions feed budgets and visual insights. Accounts can be matched from
the final digits a bank exposes in an alert. Transfers are kept out of spending
totals. Approved recurring payments reserve money before the daily allowance
is calculated.

The experience looks simple because the uncertainty is handled before a row
reaches the ledger.

<img src="/images/blog/salli/pipeline.svg" alt="Salli's SMS pipeline from safety checks through deterministic evidence and human review" loading="lazy" decoding="async" />

## Why regular expressions were necessary but not sufficient

The first parser was deterministic. It used a sender gate, a global ignore
list, and a bank template bundle ordered by priority. Each template extracted
named fields such as amount, currency, direction, merchant, account mask,
balance, and date.

That works well for a known format. It also gives excellent provenance: the app
can say which template matched and which characters supplied the amount.

The weakness appeared as soon as real examples arrived. The same event could
be written as "debited from AC", "purchase authorised on card", "money out",
or "debit for Rs". Some issuers put the currency before the amount. Others put
it after. A merchant can appear after "at", "location", or a channel label.
Spacing and punctuation vary inside the same institution.

Trying to cover every variation with more regular expressions creates a
parser that is technically deterministic but practically fragile. One broad
expression can also be worse than no expression at all if it starts matching
balance enquiries, settlement acknowledgements, or declined attempts.

So the rule engine stayed. It simply stopped being the final chance to
understand a message.

## The local classifier fallback

When a message passes the safety rules but none of the strict templates can
explain it, Salli runs a bundled classifier. It is not a mobile LLM. I tested
that direction and rejected it. The model download, native runtime,
memory use, and unpredictable output were a poor trade for a short
classification task.

The model that ships today is a 2.7 MB calibrated linear classifier. It uses an
8,192-dimensional hashed feature space built from character groups, words,
word pairs, sender information, transaction signals, and a small set of
semantic features. Seven heads make separate predictions:

1. eligibility: transaction, ignored, or uncertain
2. direction: debit, credit, transfer, refund, fee, and related states
3. transaction type
4. account type
5. institution
6. category
7. channel, such as POS, account, ATM, or online

Each head has its own confidence threshold. The lowest relevant confidence is
exposed as the overall uncertainty. A classifier result below threshold is not
promoted just because another head looks confident.

This is the important separation: the classifier interprets semantics, but it
does not invent financial values.

## Evidence still comes from the message

Amount, currency, balance, account suffix, date, time, merchant, and reference
are extracted directly from the SMS text. The app keeps the exact raw message
with the pending review item so the user can compare the proposal against its
source.

The classifier can say that unfamiliar wording probably describes a debit.
It cannot supply a missing amount. A fallback item is eligible for review only
when deterministic evidence includes an amount and currency, the transaction
head is confident, and the direction is both known and above threshold.

Safety rules always win. They currently block OTPs, promotions, declined or
failed attempts, pending authorisations, balance-only enquiries, and card
settlement acknowledgements before a fallback can create anything.

That layered design is less glamorous than end-to-end generation. It is also
much easier to test, explain, and distrust correctly.

## Training without pretending synthetic data is reality

Real bank SMS are private, inconsistent, and difficult to gather ethically.
The initial classifier was trained on generated families based on observable
transaction language and a small set of redacted, opt-in examples.

The current artifact used 15,466 synthetic training examples and 6,092
synthetic test examples. A separate 2,442-example source and institution
holdout checks whether the model only memorised sender names. The synthetic
test reports 100 percent eligibility accuracy with zero negative false
positives, and about 99.5 percent accuracy for category and direction.

Those numbers are engineering evidence, not a public performance claim.
Synthetic families share assumptions with the generator that produced them.
The model metadata says this plainly, and the release gate still requires a
reviewed collection of real, redacted messages across the supported format
matrix.

Alongside the classifier, the app has a regression suite with 1,078 generated
SMS scenarios and an offline corpus of 156 Sri Lankan merchants, billers,
processors, and ambiguous descriptors. The corpus matcher favours exact and
whole-phrase matches. Conservative fuzzy matching comes later, and a personal
rule always takes priority.

## The feedback loop is deliberately narrow

Suppose Salli reads a supermarket purchase as Shopping and the user changes it
to Groceries. The editor saves an exact, local mapping from the normalised
merchant to the chosen category. The next transaction from that merchant uses
the correction with full confidence.

That is the only automatic learning in the editor.

Changing an amount does not train the amount extractor. Editing an account
does not teach a global account rule. Changing a date does not rewrite parsing
logic. Those corrections may be useful product feedback, but applying them
automatically could damage unrelated transactions. Narrow learning is easier
to undo and easier to explain.

Users can also create merchant rules, local corpus overrides, and ignore
rules. Feedback packages are explicit exports. Nothing is uploaded in the
background.

## Accounts need stable identities

An SMS rarely reveals a complete account number. It usually shows the last
three or four digits. Salli stores a user-entered account number locally and
compares only the visible suffix during matching. A recognised transaction is
filed to that account. An unknown suffix becomes an account suggestion rather
than a silent new wallet.

Deleting an account does not delete its history. Existing transactions are
reassigned to the default Cash account in one reactive update. This keeps the
ledger valid while letting a user clean up an account list.

Available-balance evidence from SMS can also be reconciled against the local
ledger. A mismatch is presented as a possible missing amount, not as proof
that the bank or the app is wrong.

## Foreign currency without leaking the transaction

A USD card alert presents a different problem. Treating USD 9.99 as LKR 9.99
would be quietly incorrect, while asking the user to find a historical rate
every time defeats automation.

For a foreign-currency review, Salli requests a dated reference rate from the
Frankfurter API. The request contains only the three-letter currency code and
calendar date. It never includes the SMS, merchant, account, or amount. Rates
are cached locally. If the network is unavailable, a disclosed cached quote up
to seven days old can be used. Without a trustworthy quote, the item stays
unresolved instead of pretending the native amount is rupees.

Conversion uses integer minor units and a rate stored in millionths. The
original amount, original currency, effective date, source, and whether a
cached fallback was used remain attached to the transaction.

## Background Android capture without a polling service

The app does not keep a loop running and it does not scan the inbox every few
minutes. Android already provides an event for a newly received SMS.

`SmsReceiver` reassembles multipart messages. If the Flutter application is
open, it passes the message through the live event channel. If the process is
in the background or gone, it schedules one unique WorkManager job. That job
starts a headless Flutter entry point, hydrates the encrypted store, runs the
same authoritative parser and classifier pipeline, flushes persistence, then
exits.

Only a message accepted for review triggers a local notification. WorkManager
handles retries with exponential backoff and falls back from expedited work if
the device has no quota. This is event-driven, short-lived, and considerably
more battery-friendly than a permanent service.

There is an Android boundary worth stating: RCS chat messages are not standard
SMS broadcasts. A message sent through chat features may appear in the
messaging app but will not reach an SMS receiver. Beta tests must use ordinary
SMS.

## Recurring payments use history, not guesswork

Recurring detection considers confirmed debit transactions with a merchant,
excluding transfers and invalid amounts. It groups by account, normalised
merchant, and category. At least three transactions are required.

The median interval must fit a supported cadence: weekly, monthly, quarterly,
or yearly. Amounts may vary, but the maximum deviation from the median cannot
exceed 18 percent. Timing has a cadence-specific tolerance. A candidate begins
at 0.72 confidence and gains confidence for more history, stable amounts, and
tight timing.

The user approves the candidate. Once approved, its next expected charge can
reserve money in Safe to Spend. A newly confirmed matching transaction moves
the due date forward and updates the typical amount from recent history.

## Reactive local state was a feature, not plumbing

An early build persisted correctly but left the home screen stale after a
manual income entry. The data was there after reopening the app, which made
the bug more confusing. The cause was a split between database writes and the
state observed by the interface.

The current state layer uses Riverpod with optimistic updates and serialised
write-through to Drift. A change appears in memory first, then the same
snapshot is persisted in mutation order. App launch hydrates that state from
the encrypted database. Accounts, budgets, transactions, reminders, recurring
items, and settings all follow the same path.

This made the UI feel faster, but the more important result is consistency.
The number on the home screen and the row in the activity list now come from
the same reactive source.

<div class="article-screenshot-grid">
  <figure>
    <img src="/images/blog/salli/add-transaction.webp" alt="Salli full-screen transaction editor with expense and income modes" loading="lazy" decoding="async" />
    <figcaption>The manual editor keeps amount, category, merchant, account, date, labels, and notes in one place.</figcaption>
  </figure>
  <figure>
    <img src="/images/blog/salli/privacy-automation.webp" alt="Salli automation and privacy controls on Android" loading="lazy" decoding="async" />
    <figcaption>Automation is visible and adjustable. Privacy and support information work offline.</figcaption>
  </figure>
</div>

## What Salli includes today

The beta is broader than the SMS pipeline that started it. It now includes
custom expense and income categories, budgets with rollover, exact
multi-category splits, transfers, labels, local attachments, savings goals,
payday runway forecasting, receipt OCR with on-device ML Kit, account
reconciliation, Seettu circles, reminders, data export, app lock, and English,
Sinhala, and Tamil interfaces.

The local database remains the centre. Receipt images are not retained after
on-device extraction. Notification previews hide financial details by default.
There is no cloud sync, family account, or subscription service in this
version.

## The unfinished work matters

Several things still separate a strong beta from a production financial tool.
The parser and classifier need real, opt-in, redacted validation across more
Sri Lankan institutions and message formats. Sinhala and Tamil strings need
native review. iPhone behaviour needs physical-device testing, although iOS
cannot offer the same general SMS capture path as Android. Google Play
distribution also requires approval for sensitive SMS permissions.

These are not footnotes. They are the parts that determine whether the product
earns the trust its architecture is designed for.

Machine learning did not replace regular expressions in Salli. Each part kept
the job it could defend. Rules block dangerous cases. Templates provide precise
matches. A small classifier interprets unfamiliar language. Deterministic code
extracts money. The user makes the final call.

Keeping those jobs separate is what moved the app from an interesting parser
to a money tool I could trust on my own phone.

## Continue with the guides

New users can follow [Getting started with Salli](/blog/salli-getting-started).
The next guide covers [automatic SMS tracking and review](/blog/salli-auto-tracking).
For the rest of the app, read [budgets, accounts, recurring payments, and
insights](/blog/salli-planning-and-insights).
