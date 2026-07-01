package com.mjsked.app

import android.Manifest
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.collectAsState
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import androidx.navigation.NavType
import com.mjsked.app.data.ScheduledMessage
import com.mjsked.app.ui.MainViewModel
import com.mjsked.app.ui.screens.ComposeScreen
import com.mjsked.app.ui.screens.HomeScreen
import com.mjsked.app.ui.screens.SettingsScreen
import com.mjsked.app.ui.theme.MJSkedTheme

class MainActivity : ComponentActivity() {

    private val viewModel: MainViewModel by viewModels {
        MainViewModel.factory(application as MJSkedApplication)
    }

    private val requestPermissions =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        requestStartupPermissions()

        setContent {
            MJSkedTheme {
                val nav = rememberNavController()
                val state by viewModel.uiState.collectAsState()
                val emailConfig by viewModel.emailConfig.collectAsState()

                NavHost(navController = nav, startDestination = "home") {
                    composable("home") {
                        HomeScreen(
                            state = state,
                            onCompose = { nav.navigate("compose") },
                            onOpenItem = { id -> nav.navigate("compose?id=$id") },
                            onOpenSettings = { nav.navigate("settings") },
                            onPauseResume = { item ->
                                if (item.status == com.mjsked.app.data.MessageStatus.PAUSED)
                                    viewModel.resume(item) else viewModel.pause(item)
                            },
                            onDelete = viewModel::delete
                        )
                    }
                    composable(
                        route = "compose?id={id}",
                        arguments = listOf(navArgument("id") {
                            type = NavType.LongType; defaultValue = -1L
                        })
                    ) { backStack ->
                        val id = backStack.arguments?.getLong("id") ?: -1L
                        var existing by remember { mutableStateOf<ScheduledMessage?>(null) }
                        var loaded by remember { mutableStateOf(id < 0) }
                        LaunchedEffect(id) {
                            if (id >= 0) { existing = viewModel.getById(id); loaded = true }
                        }
                        if (loaded) {
                            ComposeScreen(
                                existing = existing,
                                onBack = { nav.popBackStack() },
                                onSave = viewModel::save,
                                onDelete = viewModel::delete
                            )
                        }
                    }
                    composable("settings") {
                        SettingsScreen(
                            emailConfig = emailConfig,
                            onBack = { nav.popBackStack() },
                            onSaveEmail = viewModel::saveEmailConfig
                        )
                    }
                }
            }
        }
    }

    private fun requestStartupPermissions() {
        val perms = mutableListOf(Manifest.permission.SEND_SMS)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            perms += Manifest.permission.POST_NOTIFICATIONS
        }
        requestPermissions.launch(perms.toTypedArray())

        // Exact-alarm permission is a special settings screen on Android 12+.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val am = getSystemService(android.app.AlarmManager::class.java)
            if (!am.canScheduleExactAlarms()) {
                runCatching {
                    startActivity(Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM))
                }
            }
        }
    }
}
