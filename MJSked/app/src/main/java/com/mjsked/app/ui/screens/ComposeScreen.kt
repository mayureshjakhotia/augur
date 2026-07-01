package com.mjsked.app.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Event
import androidx.compose.material3.Button
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TimePicker
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.material3.rememberTimePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import com.mjsked.app.data.MessageStatus
import com.mjsked.app.data.MessageType
import com.mjsked.app.data.Recurrence
import com.mjsked.app.data.ScheduledMessage
import com.mjsked.app.util.DateFormat
import java.util.Calendar

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ComposeScreen(
    existing: ScheduledMessage?,
    onBack: () -> Unit,
    onSave: (ScheduledMessage) -> Unit,
    onDelete: (ScheduledMessage) -> Unit
) {
    var type by remember { mutableStateOf(existing?.type ?: MessageType.SMS) }
    var recipients by remember { mutableStateOf(existing?.recipients ?: "") }
    var subject by remember { mutableStateOf(existing?.subject ?: "") }
    var body by remember { mutableStateOf(existing?.body ?: "") }
    var recurrence by remember { mutableStateOf(existing?.recurrence ?: Recurrence.NONE) }
    var whenMillis by remember {
        mutableLongStateOf(existing?.scheduledAt ?: defaultTime())
    }

    var showDate by remember { mutableStateOf(false) }
    var showTime by remember { mutableStateOf(false) }
    var showRecurrence by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (existing == null) "New schedule" else "Edit schedule") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            Modifier
                .padding(padding)
                .padding(16.dp)
                .verticalScroll(rememberScrollState())
        ) {
            SectionLabel("Channel")
            Row(
                Modifier.fillMaxWidth().padding(vertical = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // First row of channel chips
                MessageType.entries.take(3).forEach { t ->
                    FilterChip(
                        selected = type == t,
                        onClick = { type = t },
                        label = { Text(t.label) }
                    )
                }
            }
            Row(
                Modifier.fillMaxWidth().padding(bottom = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                MessageType.entries.drop(3).forEach { t ->
                    FilterChip(
                        selected = type == t,
                        onClick = { type = t },
                        label = { Text(t.label) }
                    )
                }
            }

            if (!type.isFullyAutomatic) {
                Text(
                    "MJSked will open ${type.label} with your text pre-filled at the " +
                        "scheduled time (Android blocks silent sending for this app).",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(bottom = 8.dp)
                )
            }

            if (type != MessageType.REMINDER) {
                OutlinedTextField(
                    value = recipients,
                    onValueChange = { recipients = it },
                    label = { Text(recipientLabel(type)) },
                    supportingText = { Text("One per line for multiple recipients") },
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(Modifier.height(8.dp))
            }

            if (type == MessageType.EMAIL || type == MessageType.REMINDER) {
                OutlinedTextField(
                    value = subject,
                    onValueChange = { subject = it },
                    label = { Text(if (type == MessageType.EMAIL) "Subject" else "Title") },
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(Modifier.height(8.dp))
            }

            OutlinedTextField(
                value = body,
                onValueChange = { body = it },
                label = { Text(if (type == MessageType.REMINDER) "Note" else "Message") },
                modifier = Modifier.fillMaxWidth().height(140.dp)
            )

            Spacer(Modifier.height(16.dp))
            SectionLabel("When")
            OutlinedButton(
                onClick = { showDate = true },
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(Icons.Default.Event, contentDescription = null)
                Spacer(Modifier.height(0.dp))
                Text("  ${DateFormat.full(whenMillis)}")
            }

            Spacer(Modifier.height(8.dp))
            SectionLabel("Repeat")
            OutlinedButton(
                onClick = { showRecurrence = true },
                modifier = Modifier.fillMaxWidth()
            ) { Text(recurrence.label) }

            error?.let {
                Spacer(Modifier.height(12.dp))
                Text(it, color = MaterialTheme.colorScheme.error)
            }

            Spacer(Modifier.height(24.dp))
            Button(
                onClick = {
                    val validation = validate(type, recipients, body, whenMillis)
                    if (validation != null) { error = validation; return@Button }
                    val base = (existing ?: ScheduledMessage(type = type, scheduledAt = whenMillis))
                    onSave(
                        base.copy(
                            type = type,
                            subject = subject,
                            body = body,
                            scheduledAt = whenMillis,
                            recurrence = recurrence,
                            status = MessageStatus.PENDING,
                            requireConfirmation = !type.isFullyAutomatic
                        ).withRecipients(
                            if (type == MessageType.REMINDER) emptyList()
                            else recipients.split("\n")
                        )
                    )
                    onBack()
                },
                modifier = Modifier.fillMaxWidth()
            ) { Text(if (existing == null) "Schedule it" else "Save changes") }

            if (existing != null) {
                Spacer(Modifier.height(8.dp))
                TextButton(
                    onClick = { onDelete(existing); onBack() },
                    modifier = Modifier.fillMaxWidth()
                ) { Text("Delete", color = MaterialTheme.colorScheme.error) }
            }
            Spacer(Modifier.height(24.dp))
        }
    }

    if (showDate) {
        val dateState = rememberDatePickerState(initialSelectedDateMillis = whenMillis)
        DatePickerDialog(
            onDismissRequest = { showDate = false },
            confirmButton = {
                TextButton(onClick = {
                    dateState.selectedDateMillis?.let {
                        whenMillis = mergeDate(it, whenMillis)
                    }
                    showDate = false
                    showTime = true
                }) { Text("Next") }
            },
            dismissButton = {
                TextButton(onClick = { showDate = false }) { Text("Cancel") }
            }
        ) { DatePicker(state = dateState) }
    }

    if (showTime) {
        val cal = Calendar.getInstance().apply { timeInMillis = whenMillis }
        val timeState = rememberTimePickerState(
            initialHour = cal.get(Calendar.HOUR_OF_DAY),
            initialMinute = cal.get(Calendar.MINUTE),
            is24Hour = false
        )
        Dialog(onDismissRequest = { showTime = false }) {
            androidx.compose.material3.Surface(
                shape = MaterialTheme.shapes.large,
                tonalElevation = 6.dp
            ) {
                Column(Modifier.padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("Pick a time", style = MaterialTheme.typography.titleLarge)
                    Spacer(Modifier.height(16.dp))
                    TimePicker(state = timeState)
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                        TextButton(onClick = { showTime = false }) { Text("Cancel") }
                        TextButton(onClick = {
                            whenMillis = mergeTime(whenMillis, timeState.hour, timeState.minute)
                            showTime = false
                        }) { Text("Done") }
                    }
                }
            }
        }
    }

    if (showRecurrence) {
        Dialog(onDismissRequest = { showRecurrence = false }) {
            androidx.compose.material3.Surface(
                shape = MaterialTheme.shapes.large, tonalElevation = 6.dp
            ) {
                Column(Modifier.padding(8.dp)) {
                    Recurrence.entries.forEach { r ->
                        TextButton(
                            onClick = { recurrence = r; showRecurrence = false },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                r.label,
                                modifier = Modifier.fillMaxWidth(),
                                fontWeight = if (r == recurrence) FontWeight.Bold else FontWeight.Normal
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SectionLabel(text: String) {
    Text(
        text,
        style = MaterialTheme.typography.labelSmall,
        color = MaterialTheme.colorScheme.primary,
        modifier = Modifier.padding(bottom = 4.dp)
    )
}

private fun recipientLabel(type: MessageType) = when (type) {
    MessageType.EMAIL -> "To (email address)"
    MessageType.SMS, MessageType.WHATSAPP -> "To (phone number, incl. country code)"
    MessageType.TELEGRAM -> "To (username or leave blank)"
    MessageType.REMINDER -> "To"
}

private fun validate(type: MessageType, recipients: String, body: String, whenMillis: Long): String? {
    if (whenMillis <= System.currentTimeMillis() + 5_000) return "Pick a time in the future"
    if (body.isBlank()) return "Message can't be empty"
    if (type != MessageType.REMINDER && type != MessageType.TELEGRAM &&
        recipients.isBlank()
    ) return "Add at least one recipient"
    return null
}

private fun defaultTime(): Long =
    Calendar.getInstance().apply {
        add(Calendar.HOUR_OF_DAY, 1)
        set(Calendar.SECOND, 0)
        set(Calendar.MILLISECOND, 0)
    }.timeInMillis

/** Keep the time-of-day from [timeSource] but take the date from [dateMillis]. */
private fun mergeDate(dateMillis: Long, timeSource: Long): Long {
    val date = Calendar.getInstance().apply { timeInMillis = dateMillis }
    val time = Calendar.getInstance().apply { timeInMillis = timeSource }
    return Calendar.getInstance().apply {
        set(
            date.get(Calendar.YEAR), date.get(Calendar.MONTH), date.get(Calendar.DAY_OF_MONTH),
            time.get(Calendar.HOUR_OF_DAY), time.get(Calendar.MINUTE), 0
        )
        set(Calendar.MILLISECOND, 0)
    }.timeInMillis
}

private fun mergeTime(base: Long, hour: Int, minute: Int): Long =
    Calendar.getInstance().apply {
        timeInMillis = base
        set(Calendar.HOUR_OF_DAY, hour)
        set(Calendar.MINUTE, minute)
        set(Calendar.SECOND, 0)
        set(Calendar.MILLISECOND, 0)
    }.timeInMillis
