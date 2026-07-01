package com.mjsked.app.repository

import com.mjsked.app.data.MessageStatus
import com.mjsked.app.data.ScheduledMessage
import com.mjsked.app.data.ScheduledMessageDao
import com.mjsked.app.scheduler.MessageScheduler
import kotlinx.coroutines.flow.Flow

/**
 * Single source of truth for scheduled items. Every write goes through here so
 * the Room row and the AlarmManager alarm can never drift apart: inserting a
 * pending item arms an alarm, deleting/pausing one cancels it.
 */
class MessageRepository(
    private val dao: ScheduledMessageDao,
    private val scheduler: MessageScheduler
) {
    fun observeAll(): Flow<List<ScheduledMessage>> = dao.observeAll()

    suspend fun getById(id: Long) = dao.getById(id)

    /** Create or update, then (re)arm the alarm if it is still pending. */
    suspend fun upsert(item: ScheduledMessage): Long {
        val id = dao.insert(item)
        val saved = item.copy(id = if (item.id == 0L) id else item.id)
        scheduler.cancel(saved.id)
        if (saved.status == MessageStatus.PENDING) {
            scheduler.schedule(saved)
        }
        return saved.id
    }

    suspend fun update(item: ScheduledMessage) {
        dao.update(item)
        scheduler.cancel(item.id)
        if (item.status == MessageStatus.PENDING) scheduler.schedule(item)
    }

    suspend fun delete(item: ScheduledMessage) {
        scheduler.cancel(item.id)
        dao.delete(item)
    }

    suspend fun pause(item: ScheduledMessage) {
        scheduler.cancel(item.id)
        dao.update(item.copy(status = MessageStatus.PAUSED))
    }

    suspend fun resume(item: ScheduledMessage) {
        val resumed = item.copy(status = MessageStatus.PENDING, lastError = null)
        dao.update(resumed)
        scheduler.schedule(resumed)
    }

    /** Re-arm every pending alarm — used after a reboot / app update. */
    suspend fun rescheduleAllPending() {
        dao.getByStatus(MessageStatus.PENDING).forEach { scheduler.schedule(it) }
    }
}
