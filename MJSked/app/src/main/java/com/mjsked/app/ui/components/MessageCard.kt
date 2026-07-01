package com.mjsked.app.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Message
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Repeat
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.mjsked.app.data.MessageStatus
import com.mjsked.app.data.MessageType
import com.mjsked.app.data.ScheduledMessage
import com.mjsked.app.util.DateFormat

@Composable
fun MessageCard(
    item: ScheduledMessage,
    onClick: () -> Unit,
    onPauseResume: () -> Unit,
    onDelete: () -> Unit
) {
    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant
        )
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            TypeBadge(item.type)
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    text = title(item),
                    style = MaterialTheme.typography.bodyLarge,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = item.body.ifBlank { "(no message)" },
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(Modifier.size(4.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = statusLine(item),
                        style = MaterialTheme.typography.labelSmall,
                        color = statusColor(item.status)
                    )
                    if (item.isRecurring) {
                        Spacer(Modifier.width(6.dp))
                        Icon(
                            Icons.Default.Repeat, contentDescription = "Repeats",
                            modifier = Modifier.size(14.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
            Column {
                if (item.status == MessageStatus.PENDING || item.status == MessageStatus.PAUSED) {
                    IconButton(onClick = onPauseResume) {
                        Icon(
                            if (item.status == MessageStatus.PAUSED) Icons.Default.PlayArrow
                            else Icons.Default.Pause,
                            contentDescription = "Pause or resume"
                        )
                    }
                }
                IconButton(onClick = onDelete) {
                    Icon(Icons.Default.Delete, contentDescription = "Delete")
                }
            }
        }
    }
}

@Composable
private fun TypeBadge(type: MessageType) {
    Surface(
        shape = RoundedCornerShape(10.dp),
        color = MaterialTheme.colorScheme.primaryContainer,
        modifier = Modifier.size(40.dp)
    ) {
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = iconFor(type),
                contentDescription = type.label,
                tint = MaterialTheme.colorScheme.onPrimaryContainer
            )
        }
    }
}

private fun iconFor(type: MessageType): ImageVector = when (type) {
    MessageType.SMS -> Icons.Default.Message
    MessageType.EMAIL -> Icons.Default.Email
    MessageType.WHATSAPP, MessageType.TELEGRAM -> Icons.Default.Send
    MessageType.REMINDER -> Icons.Default.Notifications
}

private fun title(item: ScheduledMessage): String = when (item.type) {
    MessageType.REMINDER -> item.subject.ifBlank { "Reminder" }
    MessageType.EMAIL -> item.subject.ifBlank { item.recipientList.firstOrNull() ?: "Email" }
    else -> item.recipientList.joinToString(", ").ifBlank { item.type.label }
}

private fun statusLine(item: ScheduledMessage): String = when (item.status) {
    MessageStatus.PENDING -> "${DateFormat.full(item.scheduledAt)} · ${DateFormat.relative(item.scheduledAt)}"
    MessageStatus.SENT -> "Sent ${item.lastSentAt?.let { DateFormat.full(it) } ?: ""}"
    MessageStatus.FAILED -> "Failed: ${item.lastError ?: "unknown error"}"
    MessageStatus.PAUSED -> "Paused"
    MessageStatus.AWAITING_CONFIRM -> "Ready to send — check notifications"
}

@Composable
private fun statusColor(status: MessageStatus) = when (status) {
    MessageStatus.FAILED -> MaterialTheme.colorScheme.error
    MessageStatus.SENT -> MaterialTheme.colorScheme.tertiary
    else -> MaterialTheme.colorScheme.onSurfaceVariant
}
