package com.mjsked.app.ui.screens

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.unit.dp
import com.mjsked.app.data.EmailConfig

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    emailConfig: EmailConfig,
    onBack: () -> Unit,
    onSaveEmail: (EmailConfig) -> Unit
) {
    var from by remember(emailConfig) { mutableStateOf(emailConfig.fromAddress) }
    var fromName by remember(emailConfig) { mutableStateOf(emailConfig.fromName) }
    var host by remember(emailConfig) { mutableStateOf(emailConfig.smtpHost) }
    var port by remember(emailConfig) { mutableStateOf(emailConfig.smtpPort.toString()) }
    var user by remember(emailConfig) { mutableStateOf(emailConfig.username) }
    var pass by remember(emailConfig) { mutableStateOf(emailConfig.password) }
    var tls by remember(emailConfig) { mutableStateOf(emailConfig.useTls) }
    var saved by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Settings") },
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
            Text("Outgoing email (SMTP)", style = MaterialTheme.typography.titleLarge)
            Text(
                "MJSked sends scheduled email straight from your account — no \"tap to " +
                    "send\" step. For Gmail, turn on 2-step verification and paste an " +
                    "App Password below. Credentials stay on this device.",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(vertical = 8.dp)
            )

            Field("From address", from) { from = it; saved = false }
            Field("From name (optional)", fromName) { fromName = it; saved = false }
            Field("SMTP host", host) { host = it; saved = false }
            Field("SMTP port", port, keyboard = KeyboardType.Number) { port = it; saved = false }
            Field("Username", user) { user = it; saved = false }
            Field("Password / App Password", pass, isPassword = true) { pass = it; saved = false }

            Card(Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
                Column(Modifier.padding(12.dp)) {
                    Row(
                        text = "Use STARTTLS (recommended)",
                        checked = tls,
                        onCheckedChange = { tls = it; saved = false }
                    )
                }
            }

            Spacer(Modifier.height(8.dp))
            Button(
                onClick = {
                    onSaveEmail(
                        EmailConfig(
                            fromAddress = from.trim(),
                            fromName = fromName.trim(),
                            smtpHost = host.trim(),
                            smtpPort = port.toIntOrNull() ?: 587,
                            username = user.trim(),
                            password = pass,
                            useTls = tls
                        )
                    )
                    saved = true
                },
                modifier = Modifier.fillMaxWidth()
            ) { Text(if (saved) "Saved ✓" else "Save email settings") }

            Spacer(Modifier.height(24.dp))
            Text("Reliability", style = MaterialTheme.typography.titleLarge)
            Text(
                "For messages to fire exactly on time, allow \"Alarms & reminders\" and " +
                    "disable battery optimization for MJSked in Android Settings. MJSked " +
                    "re-arms every schedule after a reboot automatically.",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 8.dp)
            )
        }
    }
}

@Composable
private fun Field(
    label: String,
    value: String,
    isPassword: Boolean = false,
    keyboard: KeyboardType = KeyboardType.Text,
    onChange: (String) -> Unit
) {
    OutlinedTextField(
        value = value,
        onValueChange = onChange,
        label = { Text(label) },
        singleLine = true,
        visualTransformation = if (isPassword) PasswordVisualTransformation() else androidx.compose.ui.text.input.VisualTransformation.None,
        keyboardOptions = KeyboardOptions(keyboardType = keyboard),
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)
    )
}

@Composable
private fun Row(text: String, checked: Boolean, onCheckedChange: (Boolean) -> Unit) {
    androidx.compose.foundation.layout.Row(
        Modifier.fillMaxWidth(),
        verticalAlignment = androidx.compose.ui.Alignment.CenterVertically
    ) {
        Text(text, Modifier.weight(1f))
        Switch(checked = checked, onCheckedChange = onCheckedChange)
    }
}
