package com.mjsked.app.scheduler.senders

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.provider.Settings
import com.mjsked.app.accessibility.AutoSendCoordinator
import com.mjsked.app.accessibility.SendLauncherActivity
import com.mjsked.app.data.EmailConfig
import com.mjsked.app.data.MessageType
import com.mjsked.app.data.ScheduledMessage

/** How auto-send is configured for a given fire. */
data class AutoSendOptions(
    val enabled: Boolean,
    val unlockCode: String,
    val canDrawOverlays: Boolean
)

/**
 * Routes a due [ScheduledMessage] to the correct channel.
 *
 * SMS / Email / Reminder are delivered directly. WhatsApp / Telegram take one
 * of two paths:
 *   • Auto-send (accessibility + overlay granted): wake/unlock the screen, open
 *     the chat pre-filled, and let [com.mjsked.app.accessibility.MjAccessibilityService]
 *     tap "send" — no user interaction.
 *   • Otherwise: post a "tap to send" notification (safe fallback).
 */
class SendDispatcher(private val context: Context) {

    private val sms by lazy { SmsSender(context) }
    private val email by lazy { EmailSender() }

    fun dispatch(
        item: ScheduledMessage,
        emailConfig: EmailConfig,
        autoSend: AutoSendOptions
    ): SendResult {
        return when (item.type) {
            MessageType.SMS -> sms.send(item)
            MessageType.EMAIL -> email.send(item, emailConfig)
            MessageType.REMINDER -> {
                Notifications.showReminder(context, item)
                SendResult.Sent
            }
            MessageType.WHATSAPP, MessageType.TELEGRAM -> dispatchChat(item, autoSend)
        }
    }

    private fun dispatchChat(item: ScheduledMessage, autoSend: AutoSendOptions): SendResult {
        val pkg = AutoSendCoordinator.packageFor(item.type)
        val appName = if (item.type == MessageType.TELEGRAM) "Telegram" else "WhatsApp"
        if (!isInstalled(pkg)) return SendResult.Failed("$appName is not installed")

        val chatUrl = Notifications.buildChatUrl(item)

        // Fully-automatic path: needs the accessibility helper AND overlay permission
        // (the latter lets us start the launcher activity from the background alarm).
        return if (autoSend.enabled && autoSend.canDrawOverlays) {
            AutoSendCoordinator.arm(
                AutoSendCoordinator.Request(
                    messageId = item.id,
                    type = item.type,
                    targetPackage = pkg,
                    expiresAt = System.currentTimeMillis() + AUTO_SEND_WINDOW_MS,
                    unlockCode = autoSend.unlockCode.ifBlank { null }
                )
            )
            try {
                context.startActivity(
                    SendLauncherActivity.intent(context, item.id, item.type, chatUrl)
                )
                SendResult.Sent
            } catch (e: Exception) {
                // Background-launch was blocked; fall back to the prompt.
                AutoSendCoordinator.clear()
                promptFallback(item)
            }
        } else {
            promptFallback(item)
        }
    }

    private fun promptFallback(item: ScheduledMessage): SendResult {
        val intent = Notifications.buildChatIntent(item)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        Notifications.showPreparedSend(context, item, intent)
        return SendResult.AwaitingConfirm
    }

    private fun isInstalled(pkg: String): Boolean = try {
        context.packageManager.getPackageInfo(pkg, 0)
        true
    } catch (e: PackageManager.NameNotFoundException) {
        // WhatsApp Business counts as WhatsApp installed.
        if (pkg == AutoSendCoordinator.PKG_WHATSAPP) {
            runCatching {
                context.packageManager.getPackageInfo(
                    AutoSendCoordinator.PKG_WHATSAPP_BUSINESS, 0
                )
            }.isSuccess
        } else false
    }

    companion object {
        private const val AUTO_SEND_WINDOW_MS = 60_000L
    }
}

/** True if MJSked currently holds the "Display over other apps" permission. */
fun Context.canDrawOverlays(): Boolean = Settings.canDrawOverlays(this)
