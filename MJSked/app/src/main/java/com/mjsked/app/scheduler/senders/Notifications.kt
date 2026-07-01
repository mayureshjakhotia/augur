package com.mjsked.app.scheduler.senders

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.mjsked.app.R
import com.mjsked.app.data.MessageType
import com.mjsked.app.data.ScheduledMessage

/**
 * Centralises notification channels and the two kinds of notifications MJSked
 * posts: plain reminders, and "tap to send" prompts for prepared channels
 * (WhatsApp / Telegram) that a background app is not allowed to send silently.
 */
object Notifications {

    const val CHANNEL_REMINDERS = "reminders"
    const val CHANNEL_PREPARED = "prepared_sends"
    const val CHANNEL_STATUS = "send_status"

    fun ensureChannels(context: Context) {
        val nm = context.getSystemService(NotificationManager::class.java)
        listOf(
            NotificationChannel(
                CHANNEL_REMINDERS, "Reminders",
                NotificationManager.IMPORTANCE_HIGH
            ).apply { description = "Scheduled reminders you set" },
            NotificationChannel(
                CHANNEL_PREPARED, "Ready to send",
                NotificationManager.IMPORTANCE_HIGH
            ).apply { description = "Prepared WhatsApp/Telegram messages waiting to send" },
            NotificationChannel(
                CHANNEL_STATUS, "Send results",
                NotificationManager.IMPORTANCE_LOW
            ).apply { description = "Confirmations and failures" }
        ).forEach(nm::createNotificationChannel)
    }

    fun showReminder(context: Context, item: ScheduledMessage) {
        val n = NotificationCompat.Builder(context, CHANNEL_REMINDERS)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(item.subject.ifBlank { "Reminder" })
            .setContentText(item.body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(item.body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .build()
        post(context, item.id.toInt(), n)
    }

    /** WhatsApp/Telegram can't be sent from the background, so prompt the user. */
    fun showPreparedSend(context: Context, item: ScheduledMessage, launch: Intent) {
        val pi = PendingIntent.getActivity(
            context, item.id.toInt(), launch,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val channelName = if (item.type == MessageType.TELEGRAM) "Telegram" else "WhatsApp"
        val n = NotificationCompat.Builder(context, CHANNEL_PREPARED)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle("$channelName message ready")
            .setContentText("Tap to open $channelName with your message pre-filled")
            .setStyle(NotificationCompat.BigTextStyle().bigText(item.body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pi)
            .setAutoCancel(true)
            .addAction(0, "Open $channelName", pi)
            .build()
        post(context, item.id.toInt(), n)
    }

    fun showStatus(context: Context, title: String, text: String) {
        val n = NotificationCompat.Builder(context, CHANNEL_STATUS)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(text)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setAutoCancel(true)
            .build()
        // Distinct id so status notes don't overwrite content notifications.
        post(context, ("status$text".hashCode()), n)
    }

    private fun post(context: Context, id: Int, n: Notification) {
        // POST_NOTIFICATIONS is checked by the framework; NotificationManagerCompat
        // no-ops safely if the user has blocked notifications.
        NotificationManagerCompat.from(context).notify(id, n)
    }

    /** Builds the intent that opens a chat app with [item]'s text pre-filled. */
    fun buildChatIntent(item: ScheduledMessage): Intent {
        val text = Uri.encode(item.body)
        val phone = item.recipientList.firstOrNull()?.filter { it.isDigit() || it == '+' }
        return when (item.type) {
            MessageType.TELEGRAM -> Intent(Intent.ACTION_VIEW).apply {
                data = Uri.parse("https://t.me/share/url?url=&text=$text")
            }
            else -> { // WhatsApp
                val base = if (!phone.isNullOrBlank()) {
                    "https://api.whatsapp.com/send?phone=$phone&text=$text"
                } else {
                    "https://api.whatsapp.com/send?text=$text"
                }
                Intent(Intent.ACTION_VIEW).apply { data = Uri.parse(base) }
            }
        }
    }
}
