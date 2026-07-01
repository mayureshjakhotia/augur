package com.mjsked.app.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.mjsked.app.MJSkedApplication
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * Alarms don't survive a reboot or an app update. This re-arms every pending
 * schedule so nothing is silently lost — the reliability gap that makes users
 * abandon scheduling apps.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_MY_PACKAGE_REPLACED -> {
                val app = context.applicationContext as MJSkedApplication
                val pending = goAsync()
                CoroutineScope(Dispatchers.IO).launch {
                    try {
                        app.repository.rescheduleAllPending()
                    } finally {
                        pending.finish()
                    }
                }
            }
        }
    }
}
