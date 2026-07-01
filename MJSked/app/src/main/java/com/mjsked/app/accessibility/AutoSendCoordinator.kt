package com.mjsked.app.accessibility

import com.mjsked.app.data.MessageType

/**
 * In-process hand-off between the alarm path and the [MjAccessibilityService].
 *
 * At fire time the dispatcher "arms" a [Request]; then it opens the target chat
 * app. When that app (or the lock screen) comes to the foreground, the
 * accessibility service reads the armed request and finishes the job — dismiss
 * keyguard, tap "send". Everything lives in one process, so a volatile
 * singleton is the simplest correct bridge.
 */
object AutoSendCoordinator {

    const val PKG_WHATSAPP = "com.whatsapp"
    const val PKG_WHATSAPP_BUSINESS = "com.whatsapp.w4b"
    const val PKG_TELEGRAM = "org.telegram.messenger"
    const val PKG_SYSTEMUI = "com.android.systemui"

    data class Request(
        val messageId: Long,
        val type: MessageType,
        val targetPackage: String,
        /** Give up after this epoch-millis so we never tap a stale screen. */
        val expiresAt: Long,
        /** Optional lock-screen numeric code (best-effort; secure locks block it). */
        val unlockCode: String? = null
    )

    @Volatile
    var pending: Request? = null
        private set

    fun arm(request: Request) {
        pending = request
    }

    /** Returns the live request if it targets [pkg] and hasn't expired, else null. */
    fun activeFor(pkg: String): Request? {
        val p = pending ?: return null
        if (System.currentTimeMillis() > p.expiresAt) {
            pending = null
            return null
        }
        val matches = pkg == p.targetPackage ||
            (p.targetPackage == PKG_WHATSAPP && pkg == PKG_WHATSAPP_BUSINESS)
        return if (matches) p else null
    }

    fun hasUnlockWork(pkg: String): Boolean {
        val p = pending ?: return false
        if (System.currentTimeMillis() > p.expiresAt) return false
        return pkg == PKG_SYSTEMUI && !p.unlockCode.isNullOrBlank()
    }

    fun clear() {
        pending = null
    }

    fun packageFor(type: MessageType): String = when (type) {
        MessageType.TELEGRAM -> PKG_TELEGRAM
        else -> PKG_WHATSAPP
    }
}
