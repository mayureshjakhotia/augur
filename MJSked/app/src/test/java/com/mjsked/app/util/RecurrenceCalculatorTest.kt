package com.mjsked.app.util

import com.mjsked.app.data.Recurrence
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.Calendar

class RecurrenceCalculatorTest {

    private fun at(year: Int, month: Int, day: Int, hour: Int, min: Int): Long =
        Calendar.getInstance().apply {
            set(year, month, day, hour, min, 0)
            set(Calendar.MILLISECOND, 0)
        }.timeInMillis

    @Test fun `none returns null`() {
        assertNull(RecurrenceCalculator.nextOccurrence(at(2026, 0, 1, 9, 0), Recurrence.NONE))
    }

    @Test fun `daily adds one day`() {
        val start = at(2026, 0, 1, 9, 0)
        val next = RecurrenceCalculator.nextOccurrence(start, Recurrence.DAILY)!!
        assertEquals(at(2026, 0, 2, 9, 0), next)
    }

    @Test fun `hourly adds one hour`() {
        val start = at(2026, 0, 1, 9, 0)
        val next = RecurrenceCalculator.nextOccurrence(start, Recurrence.HOURLY)!!
        assertEquals(at(2026, 0, 1, 10, 0), next)
    }

    @Test fun `weekdays skips the weekend`() {
        // 2026-01-02 is a Friday; next weekday should be Monday 2026-01-05.
        val friday = at(2026, 0, 2, 9, 0)
        val next = RecurrenceCalculator.nextOccurrence(friday, Recurrence.WEEKDAYS)!!
        val cal = Calendar.getInstance().apply { timeInMillis = next }
        assertEquals(Calendar.MONDAY, cal.get(Calendar.DAY_OF_WEEK))
        assertEquals(at(2026, 0, 5, 9, 0), next)
    }

    @Test fun `weekly advances seven days`() {
        val start = at(2026, 0, 1, 9, 0)
        val next = RecurrenceCalculator.nextOccurrence(start, Recurrence.WEEKLY)!!
        assertTrue(next > start)
        assertEquals(at(2026, 0, 8, 9, 0), next)
    }
}
