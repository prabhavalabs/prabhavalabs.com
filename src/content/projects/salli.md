---
title: 'Salli'
tagline: 'A private, local-first money companion built for Sri Lanka'
description: 'An open-source Flutter app for Android and iOS that keeps financial data on the device and turns everyday money activity into a clear safe-to-spend guide.'
tags: ['Flutter', 'On-device ML', 'Android & iOS', 'Open source']
repo: 'https://github.com/prabhavalabs/salli'
status: 'active'
featured: true
order: 1
image: '/images/projects/salli.webp'
imageWidth: 1672
imageHeight: 941
---

## Built around how money works here

Most expense trackers available to Sri Lankan users share a practical problem:
they were not designed around the way money is recorded here. The usual
fallback is to enter every purchase by hand. When an app does offer automatic
processing, it often sends transaction text to a cloud service to make sense
of it.

A bank alert can contain much more than a purchase amount. It may include an
account balance, masked card or account details, a merchant, and a timestamp.
Sending that message away means trusting a provider to protect it, process it
correctly, and return the result. We did not want Salli to begin with that
bargain.

Salli's transaction intelligence runs on the phone. The rule engine, known Sri
Lankan bank formats, and a custom-built classifier are bundled with the app.
They need no account, model download, or internet connection. Raw financial
messages are not sent to a cloud service or third party for classification.
The [source code is open under the MIT licence](https://github.com/prabhavalabs/salli),
so anyone can inspect the data path and flag a vulnerability.

We are building Salli for both Android and iOS with the same private ledger and
planning tools. Android can read supported bank SMS after the user gives clear
permission, then prepare transactions for review. Apple does not allow
third-party apps to read the general SMS inbox, so iOS uses manual and
receipt-first capture. The privacy principle stays the same on both platforms:
message classification and the ledger remain on the device.

## A bank balance is not a spending plan

A balance tells you how much money is in an account. It does not tell you how
much of that money already belongs to next week's bills, a savings goal, or a
Seettu contribution. The more useful question before buying lunch is simpler:
"What can I comfortably spend today without making the rest of the month
harder?"

Salli answers that with Safe to Spend. It starts with the income available in
the current cycle, reserves money for savings and approved commitments, counts
what has already been spent, and shares the remaining room across the days
until payday.

The result is a daily spending boundary you can understand at a glance. It
helps turn "I feel like I can afford this" into "this still fits the plan." You
can open the breakdown, inspect every input, and adjust the plan when life
changes. The number is guidance, not a judgement.

## How a bank alert becomes a transaction

A transaction SMS is not always as obvious as it looks. An OTP can contain an
amount. A failed card payment can look almost identical to a successful one.
Adding either to a person's spending history would make the whole ledger less
trustworthy.

The rule engine is the first line of defence. It checks the sender and removes
messages that are clearly not completed transactions, including OTPs,
promotions, declined or failed payments, pending authorisations, balance-only
notices, and card-settlement alerts. A blocked message never reaches the
transaction queue.

Messages that pass those checks are compared with known Sri Lankan bank
formats. If the wording is unfamiliar, Salli's compact local classifier,
trained on controlled examples shaped around Sri Lankan bank language and
message structures, helps work out whether it describes a transaction. It can
also suggest the direction, type, institution, and category. A separate
extractor copies the exact amount, currency, account suffix, merchant, date,
and time from the message itself. If the SMS does not contain an amount, the
classifier cannot fill one in.

<figure>
  <picture>
    <source
      media="(max-width: 640px)"
      srcset="/images/projects/salli-local-sms-flow-mobile.svg"
    />
    <img
      src="/images/projects/salli-local-sms-flow.svg"
      alt="A bank alert moves through Salli's rule engine, local classifier, exact detail extraction, and user review before it reaches the encrypted ledger"
      loading="lazy"
    />
  </picture>
  <figcaption>Every step runs on the phone. The user still makes the final call.</figcaption>
</figure>

The proposed transaction then goes to review. The original message stays
available for comparison. The user can correct the amount, category, account,
merchant, date, notes, or labels, then confirm the transaction when it looks
right. Only a confirmed transaction joins the ledger. If the user chooses, a
merchant category correction can become a small private rule on that device.
Other edits do not train the classifier.

## What the ledger makes possible

Automatic capture saves typing. The ledger is where Salli becomes useful. Once
the entries are trustworthy, the app can help answer everyday questions: Where
is the month going? What is due next? How much room is left before payday?

The same ledger powers category budgets, account matching from the final
digits in bank alerts, recurring-payment detection, savings goals, payday
runway forecasts, custom categories and labels, receipt OCR, transfers, Seettu
circles, reminders, encrypted local storage, and English, Sinhala, and Tamil
interfaces.

Salli is still in beta. The classifier performs well in the controlled
evaluation suite, but generated examples are not a substitute for real-world
validation. Testing with opt-in, carefully redacted Sri Lankan bank messages
remains part of the release gate.

## Read the build story

If you are curious about what sits behind the simple daily number, the full
engineering case study follows the shared Flutter app from capture to ledger.
It covers the rule engine, the local classifier, exact evidence extraction,
platform constraints, on-device storage, foreign-currency conversion, and the
false-positive filters that shape the product.

[Read how Salli was built](/blog/building-salli)

For practical setup, start with the [getting started guide](/blog/salli-getting-started),
then continue with [automatic SMS tracking](/blog/salli-auto-tracking) and
[planning, accounts, and insights](/blog/salli-planning-and-insights).
