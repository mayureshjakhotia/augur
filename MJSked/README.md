# 📅 MJSked

**Schedule WhatsApp, SMS, Email & reminders that actually send on time.**

MJSked is a native Android app for scheduling messages and reminders — inspired
by [SKEDit](https://play.google.com/store/apps/details?id=io.skedit.app), but
rebuilt from scratch to fix the things people complain about most: reliability,
intrusive permissions, ads, and a cluttered UI.

> Status: **v0.1 MVP** — the full scheduling engine and UI are implemented.
> Open in Android Studio, build, and run. See [Build & run](#build--run).

---

## Why MJSked (what the reviews asked for)

The most common 1–2★ complaints about existing scheduler apps, and how MJSked
answers each:

| Common complaint | MJSked's approach |
| --- | --- |
| *"My message never sent / sent hours late."* | **Exact alarms** (`setExactAndAllowWhileIdle`) instead of loose background windows, plus **automatic re-scheduling after reboot / app update**. Delivery fires at the minute you picked, even in Doze. |
| *"Forced me to enable an Accessibility Service just to work."* | Accessibility is **never required**. SMS, Email and Reminders send **fully automatically** with normal permissions. WhatsApp/Telegram open **pre-filled** at send time (auto-tap is an optional, clearly-labelled extra — not a gate). |
| *"Email scheduling just opens the share sheet and makes me press send."* | MJSked sends email **over your own SMTP** (e.g. a Gmail App Password) — the message leaves the outbox unattended. No tapping. |
| *"Too many ads / everything is behind a subscription."* | **No ads. No trackers. No paywall** on core scheduling. Credentials never leave the device. |
| *"Confusing, cluttered UI."* | A clean **Material 3 / Jetpack Compose** interface: one list of Upcoming vs History, one form to schedule anything, Material You dynamic color. |
| *"Battery optimization killed it."* | In-app **Reliability** guidance for the "Alarms & reminders" and battery-optimization settings, and a boot receiver that re-arms everything. |

---

## Features (v0.1)

- **Channels:** SMS, Email (SMTP auto-send), WhatsApp, Telegram, and plain Reminders.
- **Exact-time delivery** via `AlarmManager` with Doze-friendly exact alarms.
- **Recurring schedules:** hourly, daily, weekly, monthly, yearly, or weekdays-only.
- **Reboot-safe:** all pending schedules are re-armed after restart / update.
- **Multiple recipients** per schedule.
- **Pause / resume / edit / delete** any schedule.
- **History** of sent and failed items, with the failure reason surfaced.
- **Local-only & private:** Room database on device; SMTP credentials in DataStore,
  excluded from cloud backup.

---

## How delivery works per channel

| Channel | Automatic? | Mechanism |
| --- | --- | --- |
| **SMS** | ✅ Fully | `SmsManager.sendMultipartTextMessage` (needs SEND_SMS). |
| **Email** | ✅ Fully | JavaMail over your SMTP server (needs Internet). |
| **Reminder** | ✅ Fully | High-priority notification. |
| **WhatsApp / Telegram** | ⚙️ Prepared | Android forbids a background app from sending in these apps silently, so MJSked posts a "ready to send" notification that opens the chat **pre-filled** at the scheduled time. Optional accessibility auto-tap is on the roadmap and strictly opt-in. |

This is a deliberate honesty trade-off: rather than *claiming* silent WhatsApp
auto-send and failing intermittently (the #1 reliability complaint elsewhere),
MJSked makes the one unavoidable tap explicit and never breaks.

---

## Architecture

Single-module app, MVVM, Kotlin + Jetpack Compose.

```
com.mjsked.app
├─ MJSkedApplication        // manual DI / service locator (no DI framework needed)
├─ MainActivity             // Compose NavHost + runtime permission requests
├─ data/                    // Room: ScheduledMessage entity, DAO, enums, converters
│  └─ SettingsStore         // DataStore: SMTP config (private, backup-excluded)
├─ repository/
│  └─ MessageRepository     // single source of truth: DB writes ⇄ alarm arming
├─ scheduler/
│  ├─ MessageScheduler      // AlarmManager exact alarms
│  ├─ ScheduleReceiver      // fires on due time → dispatch → record → re-arm recurrence
│  └─ senders/              // SmsSender, EmailSender, Notifications, SendDispatcher
├─ receiver/
│  └─ BootReceiver          // re-arms all pending schedules after reboot
├─ ui/                      // Compose theme, MainViewModel, Home/Compose/Settings screens
└─ util/                    // RecurrenceCalculator (unit-tested), DateFormat
```

**Key design choice:** every write goes through `MessageRepository`, so the Room
row and the AlarmManager alarm can never drift apart — inserting a pending item
arms an alarm; pausing/deleting cancels it; recurrence re-arms the next fire.

### Tech
- Kotlin 2.0 · Jetpack Compose (Material 3) · Navigation-Compose
- Room (KSP) · WorkManager-ready · DataStore Preferences
- JavaMail (`com.sun.mail:android-mail`) for SMTP
- minSdk 26 · targetSdk 34 · AGP 8.5 · Gradle 8.9 · JDK 17

---

## Build & run

Requires **Android Studio Koala (2024.1)+** or a local Android SDK.

```bash
# from the MJSked/ directory
./gradlew assembleDebug          # build the debug APK
./gradlew test                   # run unit tests (RecurrenceCalculator)
./gradlew installDebug           # install on a connected device/emulator
```

Or just **open the `MJSked/` folder in Android Studio** and press Run.

### Email setup (for scheduled email)
In-app **Settings → Outgoing email (SMTP)**:
- Gmail: enable 2-Step Verification, create an **App Password**, and use
  `smtp.gmail.com` / port `587` / STARTTLS on, with the App Password as the password.
- Any other provider works too — just enter its SMTP host/port/credentials.

### Permissions the app asks for
- `SEND_SMS` — only used to send scheduled texts.
- `POST_NOTIFICATIONS` — reminders and prepared-send prompts (Android 13+).
- `SCHEDULE_EXACT_ALARM` / `USE_EXACT_ALARM` — on-time delivery.
- `RECEIVE_BOOT_COMPLETED` — re-arm schedules after reboot.
- `INTERNET` — SMTP email only.

---

## Moving this into its own GitHub repo

This project currently lives in the `MJSked/` folder of another repository. To
give it a dedicated repo:

```bash
# 1. Create an empty repo named "MJSked" on GitHub (no README/gitignore).
# 2. From this folder:
cd MJSked
git init
git add .
git commit -m "MJSked v0.1 — Android message & reminder scheduler"
git branch -M main
git remote add origin git@github.com:<you>/MJSked.git
git push -u origin main
```

Everything under `MJSked/` is self-contained (its own Gradle wrapper, settings,
and `.gitignore`), so it works as a standalone repository as-is.

---

## Roadmap (the "much better version")

- [ ] Opt-in accessibility helper for true one-shot WhatsApp/Telegram auto-send
- [ ] Contact picker (READ_CONTACTS) with name → number resolution
- [ ] Attachments for email
- [ ] Templates & quick-repeat from history
- [ ] Time-zone-aware scheduling and "send at recipient's local time"
- [ ] Home-screen widget for next-up schedules
- [ ] Encrypted export/import of schedules
- [ ] WorkManager backstop that reconciles missed alarms on next app open

Contributions and review-driven ideas welcome.
