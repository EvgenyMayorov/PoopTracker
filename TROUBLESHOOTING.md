# 🔧 Диагностика проблемы с белой страницей

## ✅ Что уже исправлено:

1. ✅ Добавлен `base: '/PoopTracker/'` в vite.config.js
2. ✅ Исправлен путь к main.tsx в index.html
3. ✅ Добавлена обработка ошибок в коде
4. ✅ Добавлено логирование для отладки
5. ✅ Упрощен index.html (убраны конфликтующие стили)

## 🎯 Теперь приложение показывает понятные ошибки!

Если что-то не так, вы увидите экран с ошибкой и инструкциями.

---

## 📋 Пошаговая проверка:

### 1. Откройте консоль браузера (F12 или Ctrl+Shift+I)

Перейдите на https://evgenymayorov.github.io/PoopTracker/

Откройте консоль (вкладка Console) и посмотрите на сообщения:

```
[PoopTracker] Инициализация...
[PoopTracker] Сессия: не найдена
```

Если видите ошибки - скопируйте их и покажите мне.

---

### 2. Проверьте, что таблицы созданы в Supabase

**Самая частая причина белой страницы - таблицы не созданы!**

#### Шаг 1: Откройте Supabase Dashboard
👉 https://supabase.com/dashboard/

#### Шаг 2: Выберите ваш проект
Проект: `iwfrojbhfihzuikxhgos`

#### Шаг 3: Перейдите в SQL Editor
Меню слева → **SQL Editor**

#### Шаг 4: Выполните SQL-скрипт

Скопируйте ВЕСЬ код из файла `supabase-schema.sql` и вставьте в SQL Editor.

Нажмите **Run** (или Ctrl+Enter).

Должно появиться:
```
Success. No rows returned
```

#### Шаг 5: Проверьте, что таблицы созданы

Меню слева → **Table Editor**

Вы должны увидеть таблицы:
- ✅ `profiles`
- ✅ `events`

---

### 3. Проверьте настройки Authentication

#### Шаг 1: Перейдите в Authentication
Меню слева → **Authentication** → **Providers**

#### Шаг 2: Настройте Email provider

Найдите **Email** и нажмите на него.

**ВАЖНО:** Отключите **"Confirm email"**

Это нужно, чтобы не требовалось подтверждение email для тестирования.

Сохраните изменения.

---

### 4. Проверьте настройки URL

Меню слева → **Authentication** → **URL Configuration**

Убедитесь, что:
- **Site URL**: `https://evgenymayorov.github.io/PoopTracker/`
- **Redirect URLs**: `https://evgenymayorov.github.io/PoopTracker/**`

---

### 5. Проверьте Replication (для Realtime)

Меню слева → **Database** → **Replication**

Убедитесь, что включены таблицы:
- ✅ `profiles`
- ✅ `events`

---

### 6. Очистите кэш и перезагрузите

1. Откройте https://evgenymayorov.github.io/PoopTracker/
2. Нажмите **Ctrl+Shift+R** (Windows/Linux) или **Cmd+Shift+R** (Mac)
3. Или откройте в режиме инкогнито

---

## 🐛 Если всё равно белая страница:

### Вариант 1: Откройте консоль браузера

1. Перейдите на сайт
2. Нажмите **F12** (или Ctrl+Shift+I)
3. Перейдите на вкладку **Console**
4. Скопируйте ВСЕ ошибки (красным цветом)
5. Покажите мне

### Вариант 2: Проверьте вкладку Network

1. Откройте DevTools (F12)
2. Перейдите на вкладку **Network**
3. Обновите страницу (F5)
4. Посмотрите, какие файлы загружаются

Должны загрузиться:
- ✅ `index.html` (статус 200)
- ✅ `index-*.js` (статус 200)
- ✅ `index-*.css` (статус 200)

Если какой-то файл имеет статус 404 - покажите мне скриншот.

### Вариант 3: Проверьте исходный код страницы

1. Нажмите **Ctrl+U** (просмотр исходного кода)
2. Найдите строки:
   ```html
   <script type="module" crossorigin src="/PoopTracker/assets/index-*.js"></script>
   <link rel="stylesheet" crossorigin href="/PoopTracker/assets/index-*.css">
   ```
3. Убедитесь, что пути начинаются с `/PoopTracker/`

---

## 📊 Ожидаемое поведение:

### Если ВСЁ правильно настроено:

1. Открывается сайт
2. Видите экран загрузки (💩 Загрузка...)
3. Появляется экран авторизации с неоновым дизайном
4. Можно зарегистрироваться или войти

### Если таблицы НЕ созданы:

Увидите экран с ошибкой:
```
⚠️ Ошибка подключения

⚠️ Таблица profiles не найдена в базе данных Supabase!

Выполните SQL-скрипт из файла supabase-schema.sql в Supabase SQL Editor.
```

---

## 🆘 Быстрая проверка Supabase

Выполните этот запрос в SQL Editor:

```sql
SELECT * FROM profiles LIMIT 5;
```

Если видите ошибку `relation "profiles" does not exist` - таблицы не созданы!

Выполните скрипт из `supabase-schema.sql`.

---

## 📝 Чек-лист:

- [ ] Открыл консоль браузера (F12)
- [ ] Проверил, что таблицы `profiles` и `events` созданы в Supabase
- [ ] Выполнил SQL-скрипт из `supabase-schema.sql`
- [ ] Отключил "Confirm email" в Authentication → Providers → Email
- [ ] Проверил Site URL в Authentication → URL Configuration
- [ ] Включил Replication для таблиц `profiles` и `events`
- [ ] Очистил кэш браузера (Ctrl+Shift+R)
- [ ] Запушил последние изменения в GitHub

---

## 💬 Если проблема осталась:

Пришлите мне:
1. Скриншот консоли браузера (F12 → Console)
2. Скриншот вкладки Network (F12 → Network)
3. Скриншот Table Editor из Supabase (список таблиц)

И я помогу разобраться! 🚀
