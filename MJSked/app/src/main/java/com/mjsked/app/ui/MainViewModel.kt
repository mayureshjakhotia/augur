package com.mjsked.app.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.mjsked.app.MJSkedApplication
import com.mjsked.app.data.EmailConfig
import com.mjsked.app.data.MessageStatus
import com.mjsked.app.data.ScheduledMessage
import com.mjsked.app.data.SettingsStore
import com.mjsked.app.repository.MessageRepository
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class HomeUiState(
    val upcoming: List<ScheduledMessage> = emptyList(),
    val history: List<ScheduledMessage> = emptyList()
)

class MainViewModel(
    private val repository: MessageRepository,
    private val settings: SettingsStore
) : ViewModel() {

    val uiState: StateFlow<HomeUiState> = repository.observeAll()
        .map { all ->
            val (done, active) = all.partition {
                it.status == MessageStatus.SENT || it.status == MessageStatus.FAILED
            }
            HomeUiState(
                upcoming = active.sortedBy { it.scheduledAt },
                history = done.sortedByDescending { it.lastSentAt ?: it.scheduledAt }
            )
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), HomeUiState())

    val emailConfig: StateFlow<EmailConfig> = settings.emailConfig
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), EmailConfig())

    val autoSendEnabled: StateFlow<Boolean> = settings.autoSendEnabled
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), false)

    val unlockCode: StateFlow<String> = settings.unlockCode
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), "")

    fun save(item: ScheduledMessage) = viewModelScope.launch {
        val stamped = if (item.createdAt == 0L) {
            item.copy(createdAt = System.currentTimeMillis())
        } else item
        repository.upsert(stamped)
    }

    fun delete(item: ScheduledMessage) = viewModelScope.launch { repository.delete(item) }
    fun pause(item: ScheduledMessage) = viewModelScope.launch { repository.pause(item) }
    fun resume(item: ScheduledMessage) = viewModelScope.launch { repository.resume(item) }

    suspend fun getById(id: Long) = repository.getById(id)

    fun saveEmailConfig(config: EmailConfig) = viewModelScope.launch {
        settings.saveEmailConfig(config)
    }

    fun setAutoSend(enabled: Boolean) = viewModelScope.launch {
        settings.setAutoSendEnabled(enabled)
    }

    fun setUnlockCode(code: String) = viewModelScope.launch {
        settings.setUnlockCode(code)
    }

    companion object {
        fun factory(app: MJSkedApplication) = object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T =
                MainViewModel(app.repository, app.settingsStore) as T
        }
    }
}
