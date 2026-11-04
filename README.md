# 💩 PoopTracker - Социальная сеть для отслеживания

Полноценное веб-приложение с авторизацией, базой данных Supabase и системой уведомлений.

## 🚀 Возможности

### ✅ Авторизация
- Регистрация с email и паролем
- Автоматическое создание профиля
- Сохранение сессии
- Retry-логика для надёжности

### 🏠 Главная страница
- Кнопка "У меня вышло!" с анимацией
- Статистика (сегодня/неделя/всего)
- Уведомления от друзей в реальном времени

### 👥 Социальные функции
- Поиск пользователей по имени
- Подписка на друзей
- Список подписчиков и подписок
- Отписка в один клик

### 🔔 Уведомления
- Браузерные push-уведомления
- Получение уведомлений когда друг "сходил"
- Realtime обновления через Supabase

### ⚙️ Настройки
- Изменение имени пользователя
- Выбор языка (RU/EN/ZH/DE/ES)
- Статистика аккаунта
- Выход из системы

## 📋 Установка и настройка

### 1. Клонирование репозитория
```bash
git clone https://github.com/evgenymayorov/PoopTracker.git
cd PoopTracker
npm install
```

### 2. Настройка Supabase

#### Создайте проект в Supabase
1. Зайдите на https://supabase.com
2. Создайте новый проект
3. Скопируйте URL проекта и anon key

#### Обновите конфигурацию
Откройте `src/lib/supabase.ts` и замените:
```typescript
const SUPABASE_URL = 'YOUR_SUPABASE_URL'
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'
```

#### Выполните SQL-скрипт
1. Откройте SQL Editor в Supabase Dashboard
2. Скопируйте содержимое `supabase-schema.sql`
3. Выполните скрипт

Это создаст таблицы:
- `profiles` - профили пользователей
- `events` - события "походов"
- `friends` - подписки
- `notifications` - уведомления

### 3. Настройка GitHub Pages

#### Измените vite.config.js
```javascript
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/PoopTracker/',
  build: {
    outDir: 'docs',
  },
})
```

#### Задеплойте
```bash
npm run build
git add .
git commit -m "Deploy to GitHub Pages"
git push
```

В настройках репозитория:
- Settings → Pages
- Source: Deploy from a branch
- Branch: main → /docs

### 4. Локальный запуск
```bash
npm run dev
```

Откройте http://localhost:5173

## 🗄️ Структура базы данных

### profiles
```sql
- id (UUID, primary key)
- username (text, unique)
- created_at (timestamp)
- updated_at (timestamp)
```

### events
```sql
- id (UUID, primary key)
- user_id (UUID, foreign key)
- created_at (timestamp)
```

### friends
```sql
- id (UUID, primary key)
- user_id (UUID, foreign key) - на кого подписаны
- follower_id (UUID, foreign key) - кто подписан
- created_at (timestamp)
```

### notifications
```sql
- id (UUID, primary key)
- user_id (UUID, foreign key) - кто получает уведомление
- friend_id (UUID, foreign key) - кто "сходил"
- friend_username (text)
- created_at (timestamp)
```

## 🔒 Безопасность (RLS)

Все таблицы защищены Row Level Security:
- Пользователи видят только свои данные
- Подписчики могут видеть события друг друга
- Профили доступны для поиска всем пользователям

## 🎨 Технологии

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Realtime**: Supabase Realtime
- **i18n**: Собственная система переводов

## 📱 Мобильная версия

Приложение адаптировано для мобильных устройств:
- Нижняя навигация
- Touch-friendly интерфейс
- Responsive дизайн

## 🌍 Мультиязычность

Поддерживаемые языки:
- 🇷🇺 Русский
- 🇬🇧 English
- 🇨🇳 中文
- 🇩🇪 Deutsch
- 🇪🇸 Español

## 🐛 Известные проблемы

- При первой регистрации может потребоваться обновление страницы
- Браузерные уведомления требуют разрешения пользователя

## 📝 Лицензия

MIT

## 👨‍💻 Автор

Evgeny Mayorov - https://github.com/evgenymayorov

---

**Важно**: Это шуточное приложение. Не используйте его для серьёзных целей! 😄
