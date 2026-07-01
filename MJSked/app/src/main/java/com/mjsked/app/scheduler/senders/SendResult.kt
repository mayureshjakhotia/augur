package com.mjsked.app.scheduler.senders

/** Outcome of a single delivery attempt. */
sealed interface SendResult {
    /** Delivered / handed off successfully. */
    data object Sent : SendResult

    /** Prepared (e.g. WhatsApp opened, pre-filled) — waiting on user to confirm. */
    data object AwaitingConfirm : SendResult

    /** Failed; [reason] is shown to the user and stored on the row. */
    data class Failed(val reason: String) : SendResult
}
