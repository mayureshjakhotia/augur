package com.mjsked.app.data

/**
 * The channel a scheduled message is delivered through.
 *
 * MJSked's design goal: everything that CAN be sent fully automatically
 * (SMS, Email) is; everything that is gated by a platform (WhatsApp,
 * Telegram) is a "prepared" send — we open the target app with the message
 * pre-filled and, optionally, auto-tap send via the (opt-in) accessibility
 * helper. No feature is silently broken by requiring accessibility the way
 * some competitors do.
 */
enum class MessageType(val label: String) {
    SMS("SMS / Text"),
    EMAIL("Email"),
    WHATSAPP("WhatsApp"),
    TELEGRAM("Telegram"),
    REMINDER("Reminder");

    /** True when MJSked can deliver this without any user interaction at send time. */
    val isFullyAutomatic: Boolean
        get() = this == SMS || this == EMAIL || this == REMINDER
}

enum class MessageStatus {
    /** Scheduled, alarm armed, waiting for its time. */
    PENDING,

    /** Delivered / handed off successfully. */
    SENT,

    /** Attempted but failed (see [ScheduledMessage.lastError]). */
    FAILED,

    /** User paused it; alarm is disarmed. */
    PAUSED,

    /** A prepared (WhatsApp/Telegram) send is waiting for the user to confirm. */
    AWAITING_CONFIRM
}

/** How often a schedule repeats. */
enum class Recurrence(val label: String) {
    NONE("Does not repeat"),
    HOURLY("Every hour"),
    DAILY("Every day"),
    WEEKLY("Every week"),
    MONTHLY("Every month"),
    YEARLY("Every year"),
    WEEKDAYS("Every weekday (Mon–Fri)");
}
