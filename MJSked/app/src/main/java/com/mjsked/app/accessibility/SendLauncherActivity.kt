package com.mjsked.app.accessibility

import android.app.Activity
import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.util.Log
import com.mjsked.app.data.MessageType

/**
 * A UI-less activity launched at fire time. Because MJSked holds the
 * "Display over other apps" permission, the alarm receiver is allowed to start
 * it from the background — and an Activity (unlike a receiver) can legally turn
 * the screen on, show over the lock screen, ask to dismiss the keyguard, and
 * then launch the chat app. The accessibility service does the final "send".
 */
class SendLauncherActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Wake the display and show over the lock screen.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(
                android.view.WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                    android.view.WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                    android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
            )
        }

        // For a non-secure keyguard this dismisses immediately; for a secure one
        // it prompts the user (the accessibility code path is our best-effort try).
        (getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager)
            ?.requestDismissKeyguard(this, null)

        val chatUri = intent.getStringExtra(EXTRA_CHAT_URI)
        if (chatUri != null) {
            runCatching {
                startActivity(
                    Intent(Intent.ACTION_VIEW, Uri.parse(chatUri))
                        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                )
            }.onFailure { Log.e(TAG, "Failed to open chat", it) }
        }
        finish()
    }

    companion object {
        private const val TAG = "SendLauncher"
        const val EXTRA_CHAT_URI = "chat_uri"
        const val EXTRA_MESSAGE_ID = "message_id"

        fun intent(context: Context, messageId: Long, type: MessageType, chatUri: String): Intent =
            Intent(context, SendLauncherActivity::class.java).apply {
                putExtra(EXTRA_MESSAGE_ID, messageId)
                putExtra(EXTRA_CHAT_URI, chatUri)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_NO_ANIMATION)
            }
    }
}
