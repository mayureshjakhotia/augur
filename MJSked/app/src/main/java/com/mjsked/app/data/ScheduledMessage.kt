package com.mjsked.app.data

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * A single scheduled item. One row = one thing MJSked will do at [scheduledAt].
 *
 * Recipients are stored as a newline-separated string in [recipients] to keep
 * the schema flat; use [recipientList] / [withRecipients] to work with it as a
 * list. For EMAIL, [recipients] holds addresses and [subject] the subject line.
 * For REMINDER, [recipients] is empty and only [body] is used.
 */
@Entity(tableName = "scheduled_messages")
data class ScheduledMessage(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val type: MessageType,
    val recipients: String = "",
    val subject: String = "",
    val body: String = "",

    /** Epoch millis of the next fire time. */
    val scheduledAt: Long,

    val recurrence: Recurrence = Recurrence.NONE,

    val status: MessageStatus = MessageStatus.PENDING,

    /** When the row was created (epoch millis). */
    val createdAt: Long = 0L,

    /** Last successful send time, if any (epoch millis). */
    val lastSentAt: Long? = null,

    /** Human-readable reason for the most recent failure. */
    val lastError: String? = null,

    /** Ask before sending (prepared sends default to true). */
    val requireConfirmation: Boolean = false,

    /** Number of times this recurring item has fired. */
    val fireCount: Int = 0
) {
    val recipientList: List<String>
        get() = recipients.split("\n").map { it.trim() }.filter { it.isNotEmpty() }

    fun withRecipients(list: List<String>): ScheduledMessage =
        copy(recipients = list.joinToString("\n") { it.trim() }.trim())

    val isRecurring: Boolean get() = recurrence != Recurrence.NONE
}
