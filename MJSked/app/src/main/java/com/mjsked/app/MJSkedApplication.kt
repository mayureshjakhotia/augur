package com.mjsked.app

import android.app.Application
import com.mjsked.app.data.AppDatabase
import com.mjsked.app.data.SettingsStore
import com.mjsked.app.repository.MessageRepository
import com.mjsked.app.scheduler.MessageScheduler
import com.mjsked.app.scheduler.senders.Notifications
import com.mjsked.app.scheduler.senders.SendDispatcher

/**
 * App-wide singletons. MJSked is small enough that a hand-rolled service
 * locator on the Application beats pulling in a DI framework — every component
 * that needs the repository/scheduler reaches it through here.
 */
class MJSkedApplication : Application() {

    val database by lazy { AppDatabase.get(this) }
    val settingsStore by lazy { SettingsStore(this) }
    val scheduler by lazy { MessageScheduler(this) }
    val sendDispatcher by lazy { SendDispatcher(this) }
    val repository by lazy {
        MessageRepository(database.scheduledMessageDao(), scheduler)
    }

    override fun onCreate() {
        super.onCreate()
        Notifications.ensureChannels(this)
    }
}
