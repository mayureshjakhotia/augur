package com.mjsked.app.util

import com.mjsked.app.data.Recurrence
import java.util.Calendar

/**
 * Pure date math for figuring out the next fire time of a recurring schedule.
 * Kept free of Android/Room types so it can be unit tested on the JVM.
 */
object RecurrenceCalculator {

    /**
     * Given the time a schedule just fired ([from], epoch millis), return the
     * next fire time, or null if it does not repeat. Weekdays skips Sat/Sun.
     */
    fun nextOccurrence(from: Long, recurrence: Recurrence): Long? {
        if (recurrence == Recurrence.NONE) return null
        val cal = Calendar.getInstance().apply { timeInMillis = from }
        when (recurrence) {
            Recurrence.HOURLY -> cal.add(Calendar.HOUR_OF_DAY, 1)
            Recurrence.DAILY -> cal.add(Calendar.DAY_OF_YEAR, 1)
            Recurrence.WEEKLY -> cal.add(Calendar.WEEK_OF_YEAR, 1)
            Recurrence.MONTHLY -> cal.add(Calendar.MONTH, 1)
            Recurrence.YEARLY -> cal.add(Calendar.YEAR, 1)
            Recurrence.WEEKDAYS -> {
                cal.add(Calendar.DAY_OF_YEAR, 1)
                while (cal.get(Calendar.DAY_OF_WEEK).let {
                        it == Calendar.SATURDAY || it == Calendar.SUNDAY
                    }) {
                    cal.add(Calendar.DAY_OF_YEAR, 1)
                }
            }
            Recurrence.NONE -> return null
        }
        return cal.timeInMillis
    }
}
