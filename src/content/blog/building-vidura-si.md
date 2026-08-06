---
title: 'Vidura: YouTube සඳහා frame-accurate සිංහල උපසිරැසි engineering කළ ආකාරය'
description: 'Vidura පිටුපස transcript pipeline එක: datacenter IP වලට YouTube captions ගන්න බැරි ඇයි, residential proxy එකයි ASR fallback එකයි එකට ගැළපෙන ආකාරය, සහ පරිවර්තනය එක structured-output call එකකින් සිදුවන හේතුව.'
date: 2026-07-19
tags: ['case-study', 'vidura', 'llm']
lang: 'si'
translationOf: 'building-vidura'
---

YouTube හි ඇති හොඳම අධ්‍යාපනික අන්තර්ගතය බහුතරයක් ඉංග්‍රීසියෙන්.
සිංහල කථිකයෙකුට ඒ භාෂා බාධකය නිසා විනාඩි 20ක පාඩමක් නැවත නැවත
rewind කරමින් බලන්න සිදුවෙනවා. YouTube ගේ auto-translate උපසිරැසි
සිංහලට ලැබෙන්නේ වචනයෙන් වචනය පරිවර්තනය වූ, ප්‍රායෝගිකව කියවිය
නොහැකි ප්‍රතිඵලයක් ලෙසයි. වාණිජ dubbing සේවා සිංහල භාෂාව ආවරණය
කරන්නේම නැහැ. [Vidura](https://vidura.prabhavalabs.com) මේ ප්‍රශ්නයට
කෙලින්ම යොමු වෙනවා: වීඩියෝවක transcript එක ලබාගෙන, LLM එකකින්
පරිවර්තනය කර, embedded player එක මත සමමුහූර්ත සිංහල උපසිරැසි ලෙස
පෙන්වන mobile-first PWA එකක්. ඒ සමඟම user ගේ watch history එකේ
ground වූ chat සහායකයෙකුත් ඇත. සම්පූර්ණයෙන් self-hosted වන මෙහි
අමාරුම ප්‍රශ්න දෙක වූයේ transcript එක ලබාගැනීම සහ පරිවර්තනය
කියවිය හැකි මට්ටමට ගෙන ඒමයි.

<img src="/images/blog/vidura/watch.png" alt="Vidura watch පිටුව: සිංහල උපසිරැසි සමඟ YouTube වීඩියෝවක්, transcript එකට ඉහළින් provenance badges" loading="lazy" decoding="async" />

*රූපය 1: Watch පිටුව. Transcript එකට ඉහළින් ඇති provenance badges වලින් timestamps ආ තැන සහ පරිවර්තනය කළ model එක පෙන්වයි.*

## පසුබිම

මුල් implementation එක සරලයි: video ID එකට caption track එක
ලබාගන්නවා, පරිවර්තනය කරනවා, පෙන්වනවා. Local development වලදී වැඩ
කළ මේ ක්‍රමය production වලදී වහාම අසාර්ථක වුණා. වෙනස තිබුණේ server
එකේ network position එකේයි.

Datacenter IP පරාසවලින් එන requests වලට YouTube bot detection යොදනවා,
අඩු වියදම් VPS එකක් තියෙන්නේ හරියටම එවැනි පරාසයක් තුළයි. Residential
connection එකකින් සාර්ථක වූ එම request එකම server එකෙන් යද්දී bot
challenge එකක් ලැබුණා. User agents මාරු කිරීම, backoff, cookie
persistence කිසිවකින් ප්‍රතිඵලය වෙනස් වුණේ නැහැ. ව්‍යුහාත්මකව
වෙනස් විය නොහැකි දෙයක්: YouTube පැත්තෙන් බලද්දී caption tracks
ඉල්ලන datacenter server එකක් scraper එකකින් වෙන් කර හඳුනාගත නොහැකියි.

## Transcript pipeline එක

<img src="/images/blog/vidura/diagram-transcript.svg" alt="රූප සටහන: VPS එකෙන් කෙළින්ම යන requests block වෙයි, residential proxy හරහා yt-dlp caption track එකට ළඟා වෙයි, Gemini audio transcription fallback එකයි" loading="lazy" decoding="async" />

*රූපය 2: Transcript ලබාගැනීම. ප්‍රාථමික මාර්ගය YouTube ගේම caption track එක; audio transcription fallback එකයි.*

Production pipeline එකේ, timestamp ගුණාත්මකභාවය අනුව අනුපිළිවෙළ වූ
මාර්ග දෙකක් ඇත:

- **ප්‍රාථමික: ගෙවන residential proxy එකක් හරහා yt-dlp.** Request
  එක සාමාන්‍ය ගෘහස්ථ ISP ලිපිනයකින් පිටවන අතර YouTube caption track
  එක සාමාන්‍ය පරිදි ලබා දෙයි. මේ මාර්ගයට ප්‍රමුඛත්වය ලැබෙන්නේ
  YouTube ගේම captions වල frame-accurate timestamps ඇති නිසයි.
- **Fallback: Gemini මගින් audio transcription.** Proxy එකක් configure
  කර නොමැති විට හෝ වීඩියෝවකට caption track එකක් නොමැති විට Vidura
  audio එක transcribe කරයි. ASR වලින් එන timestamps තත්පර තුනක පමණ
  පරාසයක වැටෙන අතර, දේශනයක් අනුගමනය කිරීමට ප්‍රමාණවත් වුවත්
  subtitle sync සඳහා පැහැදිලිවම දුර්වලයි.

මාර්ග දෙකේ ගුණාත්මක වෙනස product තීරණයකට හේතු වුණා: සෑම
වීඩියෝවක්ම එහි timestamps ආවේ YouTube captions වලින්ද transcription
එකෙන්ද යන්න කියන provenance badge එකක්, ගණනය කළ sync score එකක්,
සහ පරිවර්තනය කළ model එකේ නම සමඟ පෙන්වයි. Data එක අඩු
ගුණාත්මක විට, interface එක ඒ දෙක සමාන ලෙස ඉදිරිපත් නොකර
ඒ බව ප්‍රකාශ කරයි.

## පරිවර්තනය: එක structured-output call එකක්

පළමු පරිවර්තන implementation එක caption cues හරහා iterate වී එක
එකක් වෙන වෙනම පරිවර්තනය කළා. ප්‍රතිඵලයේ ගුණාත්මකභාවය අඩු වූයේ
නිශ්චිතව හඳුනාගත හැකි ආකාරයකට: terminology drift වුණා (එක ඉංග්‍රීසි
term එකක් දේශනයක් තුළ සිංහල වචන තුනක් බවට පත් වුණා), වාක්‍ය cue
සීමාවලදී කැඩුණා, pronouns වල referents නැති වුණා. මූල හේතුව:
caption cue එකක් වාක්‍යයක් නොවේ; එය කථිකයා නතර වූ තැන පමණයි.
Cues වෙන වෙනම පරිවර්තනය කිරීම යනු context නොමැතිව පරිවර්තනය
කිරීමයි.

<img src="/images/blog/vidura/diagram-translate.svg" alt="රූප සටහන: caption lines වෙන වෙනම පරිවර්තනයෙන් drift ඇතිවේ; Vidura සම්පූර්ණ transcript එක එක structured-output call එකකින් යවයි" loading="lazy" decoding="async" />

*රූපය 3: Cue-by-cue පරිවර්තනය හා සම්පූර්ණ-transcript පරිවර්තනය අතර වෙනස.*

Production design එක මෙය ප්‍රතිලෝම කරයි: සම්පූර්ණ transcript එකම,
grounding සඳහා වීඩියෝ title සහ description සමඟ, එක structured-output
call එකකින්. Model එක කිසිදු line එකක් පරිවර්තනය කිරීමට පෙර මුළු
දේශනයම දකින නිසා විනාඩි 2 සිට 40 දක්වා terminology ස්ථාවරව පවතින
අතර වාක්‍ය cue සීමා හරහා ගලා යයි. මෙය ආරක්ෂිත කරන guardrails
දෙකක් ඇත: core prompt එක immutable බැවින් user-configurable tone
settings වලින් output format එක දූෂණය විය නොහැක; alignment gate
එකක් ප්‍රතිඵලය source cues වලට එරෙහිව validate කරයි.

සම්පූර්ණ-transcript calls විශාල බැවින් model routing පහසුකමක් නොව
ආර්ථික අවශ්‍යතාවක් වුණා. Vidura models වලට කතා කරන්නේ OpenRouter
හරහයි: ආසන්න-ශුන්‍ය marginal වියදමට DeepSeek, වීඩියෝවකට වටින විට
GPT-පන්තියේ models. මාරු කිරීම code වෙනසක් නොව settings වෙනසකි.
Self-funded පද්ධතියකට, feature එක ආර්ථිකව පවත්වාගෙන යා හැක්කේ
ඒ නම්‍යශීලීත්වය නිසයි.

<img src="/images/blog/vidura/library.png" alt="Vidura library පිටුව: process කළ වීඩියෝ ඒවායේ sync scores සමඟ" loading="lazy" decoding="async" />

*රූපය 4: Library එක. Process කළ සෑම වීඩියෝවක්ම එහි sync score එක සහ පරිවර්තන model එක පෙන්වයි.*

## Grounded chat සහ ඉතිරි පද්ධතිය

නිවැරදි, පරිවර්තිත transcripts ලැබුණු පසු ඉතිරි features එම data
එකෙන්ම ව්‍යුත්පන්න වේ. Chat සහායකයා user ගේ library එකේ transcripts
වල ground වී, වීඩියෝව සහ timestamp එක cite කරමින් උත්තර දෙයි.
Notes playback positions වලට pin වේ. Subtitle rendering වලට size,
පාට, background, position adjustments සහාය දක්වන අතර orientation
දෙකේම fullscreen වලදී ක්‍රියාත්මක වේ. සම්පූර්ණ stack එක
self-hosted: library, notes, chat history operator ගේ server එකේම
පවතී.

<img src="/images/blog/vidura/chat.png" alt="Vidura chat සහායකයා library එකට citations සමඟ ප්‍රශ්නයකට උත්තර දෙයි" loading="lazy" decoding="async" />

*රූපය 5: Library එකට citations සමඟ transcript-grounded chat.*

## ඉදිරියට

මෙම පද්ධතියෙන් engineering නිගමන තුනක්. YouTube මත රඳා පවතින
infrastructure වලට residential egress මාර්ගයක් අවශ්‍යයි; ආචාරශීලී
workarounds වැඩ නොකරන අතර proxy වියදම feature එකේ මිලයි.
පරිවර්තන ගුණාත්මකභාවය model ප්‍රශ්නයකට පෙර context ප්‍රශ්නයකි;
per-cue calls වලින් එක සම්පූර්ණ-transcript call එකකට මාරුවීම ඕනෑම
model upgrade එකකට වඩා ප්‍රතිඵලය දියුණු කළා. Data provenance UI
එකේ පෙන්වීම, මුලින් debugging අවශ්‍යතාවක් වුවත්, වීඩියෝවක
උපසිරැසි කොතරම් විශ්වාස කළ යුතුද යන්න තීරණය කිරීමට users භාවිත
කරන feature එක බවට පත් වුණා.

Vidura open source ලෙස
[Prabhava Labs](https://github.com/prabhavalabs/vidura) යටතේ ඇත.
වත්මන් වැඩ domain terminology සඳහා per-video glossaries සහ course
playlists සඳහා batch processing ඉලක්ක කරයි.
