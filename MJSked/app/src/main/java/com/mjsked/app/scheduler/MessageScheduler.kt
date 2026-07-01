package com.mjsked.app.scheduler

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import com.mjsked.app.data.ScheduledMessage

/**
 * Wraps AlarmManager so scheduled items fire at the exact minute the user
 * picked, even in Doze. We use setExactAndAllowWhileIdle for reliability —
 * this is the single biggest complaint about competing apps ("my message never
 * sent"), and the fix is exact alarms + rescheduling on boot rather than
 * relying on inexact WorkManager windows.
 */
class MessageScheduler(private val context: Context) {

    private val alarmManager =
        context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

    fun schedule(item: ScheduledMessage) {
        val pi = pendingIntent(item.id)
        val triggerAt = item.scheduledAt

        // If the OS won't let us set exact alarms, fall back to a windowed alarm
        // rather than dropping it entirely.
        val canExact = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            alarmManager.canScheduleExactAlarms()
        } else true

        try {
            if (canExact) {
                alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP, triggerAt, pi
                )
            } else {
                alarmManager.setAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP, triggerAt, pi
                )
            }
            Log.d(TAG, "Scheduled #${item.id} for $triggerAt (exact=$canExact)")
        } catch (se: SecurityException) {
            // Exact-alarm permission revoked mid-flight; degrade gracefully.
            alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi)
            Log.w(TAG, "Exact alarm denied, used inexact for #${item.id}", se)
        }
    }

    fun cancel(id: Long) {
        alarmManager.cancel(pendingIntent(id))
    }

    private fun pendingIntent(id: Long): PendingIntent {
        val intent = Intent(context, ScheduleReceiver::class.java).apply {
            action = ACTION_FIRE
            putExtra(EXTRA_ID, id)
            // Make the intent unique per id so PendingIntents don't collide.
            data = android.net.Uri.parse("mjsked://fire/$id")
        }
        return PendingIntent.getBroadcast(
            context, id.toInt(), intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    companion object {
        private const val TAG = "MessageScheduler"
        const val ACTION_FIRE = "com.mjsked.app.ACTION_FIRE"
        const val EXTRA_ID = "extra_id"
    }
}
