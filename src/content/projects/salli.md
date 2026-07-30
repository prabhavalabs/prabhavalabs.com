---
title: 'Salli'
tagline: 'A private money companion built for Sri Lankan bank SMS'
description: 'A local-first Flutter app that turns supported transaction SMS into an editable ledger, then helps plan the distance to payday with budgets, recurring payments, accounts, and visual insights.'
tags: ['Flutter', 'On-device ML', 'Android', 'Local-first']
repo: 'https://github.com/prabhavalabs/salli'
status: 'active'
featured: true
order: 1
image: '/images/projects/salli.webp'
imageWidth: 1672
imageHeight: 941
---

## Money software has a trust problem

Most expense trackers make people do one of two uncomfortable things. They ask
for every purchase to be typed by hand, or they ask for access to a remote
financial account. Salli takes a third route on Android. It reads transaction
alerts that already arrive as SMS, extracts only the evidence it can justify,
and keeps the result on the phone.

The useful number on the home screen is not a bank balance. It is what can be
spent today after income, savings, commitments, budgets, and the remaining
days in the payday cycle have been considered.

## A conservative SMS pipeline

The parser is intentionally suspicious. OTPs, promotions, failed payments,
pending authorisations, and balance-only alerts are blocked before transaction
matching begins. Known message templates run first. A compact local classifier
handles unfamiliar wording only when the message still contains deterministic
evidence such as an amount and direction.

Every captured item goes to review. The amount, category, account, date, and
merchant can be corrected before it joins the confirmed ledger. A category
correction can become a narrow on-device rule for that exact merchant. Other
edits do not train anything silently.

## More than capture

Salli includes category budgets, account matching by the final digits shown in
bank alerts, recurring-payment detection, savings goals, payday runway
forecasts, custom categories and labels, receipt OCR, transfers, Seettu
circles, reminders, encrypted local storage, and English, Sinhala, and Tamil
interfaces.

The app is in beta. Its synthetic classifier evaluation is encouraging, but it
does not replace validation with real, opt-in, redacted Sri Lankan bank
messages. That work remains part of the release gate.

## Read the build story

The full engineering case study explains the rule engine, the classifier
fallback, deterministic extraction, background Android capture, foreign
currency conversion, and the false-positive rules that shape the product.

[Read how Salli was built](/blog/building-salli)

For practical setup, start with the [getting started guide](/blog/salli-getting-started),
then continue with [automatic SMS tracking](/blog/salli-auto-tracking) and
[planning, accounts, and insights](/blog/salli-planning-and-insights).
