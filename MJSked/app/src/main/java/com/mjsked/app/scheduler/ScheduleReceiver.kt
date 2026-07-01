package com.mjsked.app.scheduler

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.mjsked.app.MJSkedApplication
import com.mjsked.app.data.MessageStatus
import com.mjsked.app.data.ScheduledMessage
import com.mjsked.app.scheduler.senders.SendResult
import com.mjsked.app.util.RecurrenceCalculator
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

/**
 * Fired by AlarmManager when an item is due. Delivers it, records the outcome,
 * and — for recurring items — arms the next occurrence. Uses goAsync() so the
 * short DB + network work can finish after onReceive returns.
 */
class ScheduleReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != MessageScheduler.ACTION_FIRE) return
        val id = intent.getLongExtra(MessageScheduler.EXTRA_ID, -1L)
        if (id < 0) return

        val app = context.applicationContext as MJSkedApplication
        val pending = goAsync()

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val dao = app.database.scheduledMessageDao()
                val item = dao.getById(id) ?: return@launch
                if (item.status != MessageStatus.PENDING) return@launch

                val emailConfig = app.settingsStore.emailConfig.first()
                val result = app.sendDispatcher.dispatch(item, emailConfig)

                val now = System.currentTimeMillis()
                val next = RecurrenceCalculator.nextOccurrence(item.scheduledAt, item.recurrence)

                val updated = applyResult(item, result, now, next)
                dao.update(updated)

                // Re-arm next occurrence for recurring items that succeeded/handed off.
                if (next != null && result !is SendResult.Failed) {
                    app.scheduler.schedule(updated)
                }
                Log.d(TAG, "Fired #$id -> $result (next=$next)")
            } catch (e: Exception) {
                Log.e(TAG, "Error firing #$id", e)
            } finally {
                pending.finish()
            }
        }
    }

    private fun applyResult(
        item: ScheduledMessage,
        result: SendResult,
        now: Long,
        next: Long?
    ): ScheduledMessage {
        val fired = item.copy(fireCount = item.fireCount + 1)
        return when (result) {
            is SendResult.Sent -> fired.copy(
                status = if (next != null) MessageStatus.PENDING else MessageStatus.SENT,
                scheduledAt = next ?: item.scheduledAt,
                lastSentAt = now,
                lastError = null
            )
            is SendResult.AwaitingConfirm -> fired.copy(
                status = if (next != null) MessageStatus.PENDING else MessageStatus.AWAITING_CONFIRM,
                scheduledAt = next ?: item.scheduledAt,
                lastSentAt = now,
                lastError = null
            )
            is SendResult.Failed -> fired.copy(
                status = MessageStatus.FAILED,
                lastError = result.reason
            )
        }
    }

    companion object {
        private const val TAG = "ScheduleReceiver"
    }
}
