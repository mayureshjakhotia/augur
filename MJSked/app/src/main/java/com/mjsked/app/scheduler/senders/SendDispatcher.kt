package com.mjsked.app.scheduler.senders

import android.content.Context
import com.mjsked.app.data.EmailConfig
import com.mjsked.app.data.MessageType
import com.mjsked.app.data.ScheduledMessage

/**
 * Routes a due [ScheduledMessage] to the correct channel and returns the
 * result. This is the one place that knows "type -> how to deliver", so the
 * receiver stays dumb.
 */
class SendDispatcher(private val context: Context) {

    private val sms by lazy { SmsSender(context) }
    private val email by lazy { EmailSender() }

    fun dispatch(item: ScheduledMessage, emailConfig: EmailConfig): SendResult {
        return when (item.type) {
            MessageType.SMS -> sms.send(item)
            MessageType.EMAIL -> email.send(item, emailConfig)
            MessageType.REMINDER -> {
                Notifications.showReminder(context, item)
                SendResult.Sent
            }
            MessageType.WHATSAPP, MessageType.TELEGRAM -> {
                // Cannot be sent silently from the background; post a prompt
                // that opens the target app with the message pre-filled.
                val intent = Notifications.buildChatIntent(item).apply {
                    addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                if (intent.resolveActivity(context.packageManager) == null) {
                    val app = if (item.type == MessageType.TELEGRAM) "Telegram" else "WhatsApp"
                    SendResult.Failed("$app is not installed")
                } else {
                    Notifications.showPreparedSend(context, item, intent)
                    SendResult.AwaitingConfirm
                }
            }
        }
    }
}
