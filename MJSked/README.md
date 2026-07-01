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
| **WhatsApp / Telegram** | ✅ With auto-send on | Same mechanism as SKEDit: an **opt-in accessibility service** taps "Send" after MJSked wakes the screen and opens the chat pre-filled. With auto-send **off**, MJSked instead posts a tap-to-send notification (safe fallback). |

### WhatsApp / Telegram auto-send

When enabled in **Settings → WhatsApp / Telegram auto-send**, a scheduled chat
message fires with zero interaction:

1. The alarm launches a tiny, invisible activity (allowed from the background
   because MJSked holds the **Display over other apps** permission).
2. That activity **wakes the screen**, asks to **dismiss the keyguard**, and —
   if you saved a lock-screen code — the accessibility service **best-effort
   types it** (see the security note below).
3. It opens the chat in WhatsApp/Telegram with your text pre-filled.
4. The **accessibility service taps "Send"** and clears the request.

The accessibility service is **scoped to WhatsApp, Telegram and the lock screen
only** (declared in `accessibility_service_config.xml`) — it cannot read your
other apps.

> **Security note — "unlock by code":** No Android app can bypass a **secure**
> PIN, pattern, or biometric lock; that is an OS guarantee (SKEDit can't either).
> MJSked can reliably wake the screen and dismiss a **non-secure / swipe** lock,
> and will *attempt* to type a stored numeric code on the lock screen, but a
> secure keyguard will still stop it. For guaranteed unattended sends, either
> use a non-secure lock or keep the device unlocked at send time.

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

## Get a ready-to-install APK (no toolchain needed)

Every push that touches `MJSked/` triggers the **MJSked Android build** GitHub
Action (`.github/workflows/mjsked-android.yml`), which runs the unit tests and
produces a debug APK:

1. Open the repo's **Actions** tab → latest **MJSked Android build** run.
2. Download the **`mjsked-debug-apk`** artifact.
3. Copy the `.apk` to your phone and install it (allow "install unknown apps").
4. Open MJSked → **Settings** to turn on auto-send + (optionally) SMTP email.

This exists because the app can't be compiled in every environment — CI builds
the installable artifact for you.

## Build & run locally

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

- [x] Opt-in accessibility helper for one-shot WhatsApp/Telegram auto-send
- [x] Screen-wake + keyguard-dismiss + best-effort lock-screen code at send time
- [x] GitHub Actions CI that builds an installable APK
- [ ] Contact picker (READ_CONTACTS) with name → number resolution
- [ ] Attachments for email
- [ ] Templates & quick-repeat from history
- [ ] Time-zone-aware scheduling and "send at recipient's local time"
- [ ] Home-screen widget for next-up schedules
- [ ] Encrypted export/import of schedules
- [ ] WorkManager backstop that reconciles missed alarms on next app open

Contributions and review-driven ideas welcome.
