package com.mjsked.app.data

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore by preferencesDataStore(name = "mjsked_settings")

/**
 * Holds the user's outgoing-email (SMTP) credentials so MJSked can send email
 * fully automatically — no "tap send" step, unlike apps that just open a share
 * sheet. Credentials never leave the device.
 */
data class EmailConfig(
    val fromAddress: String = "",
    val fromName: String = "",
    val smtpHost: String = "smtp.gmail.com",
    val smtpPort: Int = 587,
    val username: String = "",
    val password: String = "",
    val useTls: Boolean = true
) {
    val isConfigured: Boolean
        get() = fromAddress.isNotBlank() && smtpHost.isNotBlank() &&
            username.isNotBlank() && password.isNotBlank()
}

class SettingsStore(private val context: Context) {

    private object Keys {
        val FROM = stringPreferencesKey("email_from")
        val FROM_NAME = stringPreferencesKey("email_from_name")
        val HOST = stringPreferencesKey("smtp_host")
        val PORT = intPreferencesKey("smtp_port")
        val USER = stringPreferencesKey("smtp_user")
        val PASS = stringPreferencesKey("smtp_pass")
        val TLS = booleanPreferencesKey("smtp_tls")
        val AUTO_TAP = booleanPreferencesKey("wa_auto_tap")
    }

    val emailConfig: Flow<EmailConfig> = context.dataStore.data.map { p ->
        EmailConfig(
            fromAddress = p[Keys.FROM] ?: "",
            fromName = p[Keys.FROM_NAME] ?: "",
            smtpHost = p[Keys.HOST] ?: "smtp.gmail.com",
            smtpPort = p[Keys.PORT] ?: 587,
            username = p[Keys.USER] ?: "",
            password = p[Keys.PASS] ?: "",
            useTls = p[Keys.TLS] ?: true
        )
    }

    /** Whether the accessibility helper should auto-tap "send" for prepared sends. */
    val whatsAppAutoTap: Flow<Boolean> = context.dataStore.data.map { it[Keys.AUTO_TAP] ?: false }

    suspend fun saveEmailConfig(c: EmailConfig) {
        context.dataStore.edit { p ->
            p[Keys.FROM] = c.fromAddress
            p[Keys.FROM_NAME] = c.fromName
            p[Keys.HOST] = c.smtpHost
            p[Keys.PORT] = c.smtpPort
            p[Keys.USER] = c.username
            p[Keys.PASS] = c.password
            p[Keys.TLS] = c.useTls
        }
    }

    suspend fun setWhatsAppAutoTap(enabled: Boolean) {
        context.dataStore.edit { it[Keys.AUTO_TAP] = enabled }
    }
}
