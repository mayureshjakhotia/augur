package com.mjsked.app.scheduler.senders

import com.mjsked.app.data.EmailConfig
import com.mjsked.app.data.ScheduledMessage
import java.util.Properties
import javax.mail.Authenticator
import javax.mail.Message
import javax.mail.PasswordAuthentication
import javax.mail.Session
import javax.mail.Transport
import javax.mail.internet.InternetAddress
import javax.mail.internet.MimeMessage

/**
 * Sends email fully automatically over SMTP using the user's own outgoing
 * server (e.g. a Gmail app-password). This is a deliberate improvement over
 * apps that only fire an ACTION_SEND intent and force the user to press "send"
 * — MJSked's scheduled email actually leaves the outbox unattended.
 */
class EmailSender {

    fun send(item: ScheduledMessage, config: EmailConfig): SendResult {
        if (!config.isConfigured) {
            return SendResult.Failed("Email not set up — add SMTP details in Settings")
        }
        val recipients = item.recipientList
        if (recipients.isEmpty()) return SendResult.Failed("No recipient")

        return try {
            val props = Properties().apply {
                put("mail.smtp.auth", "true")
                put("mail.smtp.host", config.smtpHost)
                put("mail.smtp.port", config.smtpPort.toString())
                if (config.useTls) {
                    put("mail.smtp.starttls.enable", "true")
                } else {
                    put("mail.smtp.socketFactory.port", config.smtpPort.toString())
                    put("mail.smtp.socketFactory.class", "javax.net.ssl.SSLSocketFactory")
                }
                put("mail.smtp.connectiontimeout", "15000")
                put("mail.smtp.timeout", "15000")
            }

            val session = Session.getInstance(props, object : Authenticator() {
                override fun getPasswordAuthentication() =
                    PasswordAuthentication(config.username, config.password)
            })

            val msg = MimeMessage(session).apply {
                setFrom(InternetAddress(config.fromAddress, config.fromName))
                recipients.forEach {
                    addRecipient(Message.RecipientType.TO, InternetAddress(it))
                }
                subject = item.subject.ifBlank { "(no subject)" }
                setText(item.body)
            }

            Transport.send(msg)
            SendResult.Sent
        } catch (e: Exception) {
            SendResult.Failed(e.message ?: "Email send failed")
        }
    }
}
