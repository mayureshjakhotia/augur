package com.mjsked.app.util

import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

object DateFormat {
    private val full = SimpleDateFormat("EEE, MMM d · h:mm a", Locale.getDefault())
    private val timeOnly = SimpleDateFormat("h:mm a", Locale.getDefault())

    fun full(millis: Long): String = full.format(Date(millis))
    fun time(millis: Long): String = timeOnly.format(Date(millis))

    /** "in 2h 15m" / "in 3 days" / "now" — a friendly countdown. */
    fun relative(millis: Long, now: Long = System.currentTimeMillis()): String {
        val diff = millis - now
        if (diff <= 0) return "now"
        val mins = diff / 60_000
        val hours = mins / 60
        val days = hours / 24
        return when {
            days >= 1 -> "in $days day${if (days > 1) "s" else ""}"
            hours >= 1 -> "in ${hours}h ${mins % 60}m"
            mins >= 1 -> "in ${mins}m"
            else -> "in <1m"
        }
    }
}
