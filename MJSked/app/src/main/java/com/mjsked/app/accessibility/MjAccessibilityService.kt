package com.mjsked.app.accessibility

import android.accessibilityservice.AccessibilityService
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import com.mjsked.app.data.MessageType

/**
 * The piece that makes WhatsApp/Telegram scheduling actually *send* — the same
 * mechanism SKEDit uses. It watches only the chat apps and the system lock
 * screen (declared in accessibility_service_config.xml, so it can't read your
 * other apps), and when a send is armed by [AutoSendCoordinator] it:
 *
 *   1. best-effort types the stored code on a non-secure lock screen, then
 *   2. taps the "send" button once the chat app is in the foreground.
 *
 * It is deliberately fire-once per request and time-boxed, so it never taps a
 * screen the user opened themselves.
 */
class MjAccessibilityService : AccessibilityService() {

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        val pkg = event?.packageName?.toString() ?: return

        // Lock screen: attempt the numeric code if one is configured.
        if (AutoSendCoordinator.hasUnlockWork(pkg)) {
            AutoSendCoordinator.pending?.unlockCode?.let { tryEnterCode(it) }
            return
        }

        val request = AutoSendCoordinator.activeFor(pkg) ?: return
        val clicked = when (request.type) {
            MessageType.TELEGRAM -> tapSend(TELEGRAM_SEND_DESCRIPTIONS, TELEGRAM_SEND_IDS)
            else -> tapSend(WHATSAPP_SEND_DESCRIPTIONS, WHATSAPP_SEND_IDS)
        }
        if (clicked) {
            Log.d(TAG, "Auto-sent message #${request.messageId} in $pkg")
            AutoSendCoordinator.clear()
        }
    }

    override fun onInterrupt() { /* no-op */ }

    /** Find the send control by resource-id first, then by description, and click it. */
    private fun tapSend(descriptions: List<String>, viewIds: List<String>): Boolean {
        val root = rootInActiveWindow ?: return false
        for (id in viewIds) {
            root.findAccessibilityNodeInfosByViewId(id)
                ?.firstOrNull { it.isClickableChain() }
                ?.let { return it.clickSelfOrParent() }
        }
        val match = findByDescription(root, descriptions)
        return match?.clickSelfOrParent() ?: false
    }

    /** Best-effort lock-screen unlock: click each digit, then Enter. Secure PIN pads may block this. */
    private fun tryEnterCode(code: String) {
        val root = rootInActiveWindow ?: return
        for (ch in code) {
            val digit = ch.toString()
            val node =
                root.findAccessibilityNodeInfosByViewId("com.android.systemui:id/digit_$digit")
                    ?.firstOrNull()
                    ?: findByText(root, digit)
            node?.clickSelfOrParent()
        }
        // Some lock screens auto-submit; others need an explicit enter key.
        root.findAccessibilityNodeInfosByViewId("com.android.systemui:id/key_enter")
            ?.firstOrNull()
            ?.clickSelfOrParent()
    }

    private fun findByDescription(
        node: AccessibilityNodeInfo?,
        needles: List<String>
    ): AccessibilityNodeInfo? {
        if (node == null) return null
        val desc = node.contentDescription?.toString()?.lowercase()
        if (desc != null && needles.any { desc.contains(it) } && node.isClickableChain()) {
            return node
        }
        for (i in 0 until node.childCount) {
            findByDescription(node.getChild(i), needles)?.let { return it }
        }
        return null
    }

    private fun findByText(node: AccessibilityNodeInfo?, text: String): AccessibilityNodeInfo? {
        if (node == null) return null
        if (node.text?.toString()?.trim() == text) return node
        for (i in 0 until node.childCount) {
            findByText(node.getChild(i), text)?.let { return it }
        }
        return null
    }

    private fun AccessibilityNodeInfo.isClickableChain(): Boolean {
        var n: AccessibilityNodeInfo? = this
        var depth = 0
        while (n != null && depth < 6) {
            if (n.isClickable) return true
            n = n.parent
            depth++
        }
        return false
    }

    private fun AccessibilityNodeInfo.clickSelfOrParent(): Boolean {
        var n: AccessibilityNodeInfo? = this
        var depth = 0
        while (n != null && depth < 6) {
            if (n.isClickable && n.performAction(AccessibilityNodeInfo.ACTION_CLICK)) return true
            n = n.parent
            depth++
        }
        return false
    }

    companion object {
        private const val TAG = "MjAccessibility"
        // WhatsApp's send FAB resource id has been stable for years.
        private val WHATSAPP_SEND_IDS = listOf("com.whatsapp:id/send", "com.whatsapp.w4b:id/send")
        private val WHATSAPP_SEND_DESCRIPTIONS = listOf("send")
        private val TELEGRAM_SEND_IDS = listOf("org.telegram.messenger:id/chat_send_button")
        private val TELEGRAM_SEND_DESCRIPTIONS = listOf("send")
    }
}
