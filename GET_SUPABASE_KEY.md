# 🔑 Как получить правильный SUPABASE_ANON_KEY

## ⚠️ Проблема

В файле `src/lib/supabase.ts` указан **неправильный** ключ:
```
sb_publishable_WLRRL4gwUTpbJHPFkp5sbg_-G8y5Jil
```

Этот ключ слишком короткий (42 символа) и не является JWT токеном.

**Правильный anon key:**
- Начинается с `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- Содержит 200+ символов
- Это JWT токен

---

## 📋 Пошаговая инструкция

### Шаг 1: Откройте Supabase Dashboard

Перейдите на: https://supabase.com/dashboard/

Войдите в свой аккаунт.

### Шаг 2: Выберите проект

Найдите проект с ID: `iwfrojbhfihzuikxhgos`

Кликните на него.

### Шаг 3: Перейдите в настройки API

В левом меню найдите и кликните:

```
⚙️ Settings (шестерёнка внизу)
   └── API
```

Или напрямую: https://supabase.com/dashboard/project/iwfrojbhfihzuikxhgos/settings/api

### Шаг 4: Скопируйте Project URL и anon key

На странице API вы увидите две секции:

#### 📍 Project URL
```
https://iwfrojbhfihzuikxhgos.supabase.co
```
✅ Этот URL уже правильный в коде!

#### 🔑 Project API keys

Найдите секцию **"Project API keys"** и скопируйте:

**anon public** (публичный ключ)

Он выглядит так:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3ZnJvamJmZmloenVpa3hoaGdvcyIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzE2NzY4MDAwLCJleHAiOjIwMzIzNDQwMDB9.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**ВАЖНО:** Ключ очень длинный (200+ символов)! Убедитесь, что скопировали его полностью.

### Шаг 5: Замените ключ в коде

Откройте файл: `src/lib/supabase.ts`

Найдите строку:
```typescript
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

Замените её на скопированный ключ:
```typescript
const SUPABASE_ANON_KEY = 'ваш_длинный_ключ_из_supabase_dashboard'
```

### Шаг 6: Сохраните и запушьте

```bash
git add src/lib/supabase.ts
git commit -m "Fix: правильный Supabase anon key"
git push
```

### Шаг 7: Дождитесь деплоя

GitHub Pages автоматически пересоберёт сайт (1-2 минуты).

---

## 🔍 Как проверить, что ключ правильный

Откройте консоль браузера (F12) на сайте и посмотрите на логи:

### ✅ Правильный ключ:
```
[Supabase] Key length: 220 characters
[Supabase] Key starts with: eyJhbGciOiJIUzI1NiIsInR5...
```

### ❌ Неправильный ключ:
```
[Supabase] ⚠️ НЕПРАВИЛЬНЫЙ ANON KEY!
[Supabase] Key length: 42 characters
```

---

## 🎯 Что должно произойти после исправления

1. Откройте сайт: https://evgenymayorov.github.io/PoopTracker/
2. Откройте консоль (F12)
3. Вы должны увидеть:
   ```
   [Supabase] URL: https://iwfrojbhfihzuikxhgos.supabase.co
   [Supabase] Key length: 220 characters
   [Supabase] Key starts with: eyJhbGciOiJIUzI1NiIsInR5...
   [PoopTracker] Запуск приложения...
   [PoopTracker] Проверка текущей сессии...
   [PoopTracker] Текущая сессия: не найдена
   ```
4. Появится экран авторизации 💩

---

## 🆘 Если всё ещё не работает

### Проверка 1: URL правильный?

В Supabase Dashboard → Settings → API → Project URL

Должно быть: `https://iwfrojbhfihzuikxhgos.supabase.co`

### Проверка 2: Ключ начинается с eyJ?

Правильный ключ **ВСЕГДА** начинается с `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9`

### Проверка 3: Ключ длинный?

Правильный ключ содержит **200+ символов**

### Проверка 4: Проект существует?

Откройте в браузере: https://iwfrojbhfihzuikxhgos.supabase.co

Должна открыться страница Supabase (не 404 ошибка).

---

## 📸 Где найти ключ в Supabase Dashboard

```
Dashboard
  └── Ваш проект (iwfrojbhfihzuikxhgos)
       └── ⚙️ Settings (шестерёнка)
            └── API
                 ├── Project URL: https://...
                 └── Project API keys
                      ├── anon public ← ЭТОТ КЛЮЧ НУЖЕН!
                      └── service_role (НЕ ЭТОТ!)
```

**ВАЖНО:** Используйте **anon public**, а НЕ service_role!

---

## ✅ Чек-лист

- [ ] Открыл Supabase Dashboard
- [ ] Нашёл проект iwfrojbhfihzuikxhgos
- [ ] Перешёл в Settings → API
- [ ] Скопировал **anon public** key (не service_role!)
- [ ] Ключ начинается с `eyJ...`
- [ ] Ключ содержит 200+ символов
- [ ] Заменил ключ в `src/lib/supabase.ts`
- [ ] Запушил изменения в GitHub
- [ ] Дождался деплоя
- [ ] Открыл сайт и проверил консоль (F12)

---

## 💡 Альтернатива: Создайте новый проект

Если не можете найти ключ или проект не существует:

1. Откройте https://supabase.com/dashboard/
2. Нажмите **"New Project"**
3. Заполните:
   - Name: `pooptracker`
   - Database Password: (придумайте пароль)
   - Region: (выберите ближайший)
4. Дождитесь создания (2-3 минуты)
5. Скопируйте новые URL и ключ из Settings → API
6. Обновите `src/lib/supabase.ts`
7. Выполните SQL-скрипт из `supabase-schema.sql`

---

После замены ключа приложение должно заработать! 🚀
