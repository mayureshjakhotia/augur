package com.mjsked.app.scheduler.senders

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.telephony.SmsManager
import androidx.core.content.ContextCompat
import com.mjsked.app.data.ScheduledMessage

/** Sends SMS fully automatically via [SmsManager] — no user tap required. */
class SmsSender(private val context: Context) {

    fun send(item: ScheduledMessage): SendResult {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.SEND_SMS)
            != PackageManager.PERMISSION_GRANTED
        ) {
            return SendResult.Failed("SMS permission not granted")
        }
        val recipients = item.recipientList
        if (recipients.isEmpty()) return SendResult.Failed("No recipient")
        if (item.body.isBlank()) return SendResult.Failed("Empty message")

        return try {
            val sms = smsManager()
            recipients.forEach { number ->
                // Split long messages so >160-char texts are delivered intact.
                val parts = sms.divideMessage(item.body)
                sms.sendMultipartTextMessage(number, null, parts, null, null)
            }
            SendResult.Sent
        } catch (e: Exception) {
            SendResult.Failed(e.message ?: "SMS send failed")
        }
    }

    @Suppress("DEPRECATION")
    private fun smsManager(): SmsManager =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            context.getSystemService(SmsManager::class.java)
        } else {
            SmsManager.getDefault()
        }
}
