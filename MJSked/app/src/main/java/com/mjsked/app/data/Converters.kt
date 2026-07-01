package com.mjsked.app.data

import androidx.room.TypeConverter

class Converters {
    @TypeConverter fun toType(v: String) = MessageType.valueOf(v)
    @TypeConverter fun fromType(t: MessageType) = t.name

    @TypeConverter fun toStatus(v: String) = MessageStatus.valueOf(v)
    @TypeConverter fun fromStatus(s: MessageStatus) = s.name

    @TypeConverter fun toRecurrence(v: String) = Recurrence.valueOf(v)
    @TypeConverter fun fromRecurrence(r: Recurrence) = r.name
}
