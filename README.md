# 💩 PoopTracker - Социальная сеть для отслеживания

Полноценное веб-приложение с авторизацией, базой данных Supabase, системой уведомлений и PWA поддержкой.

## 🚀 Возможности

### ✅ Авторизация
- Регистрация с email и паролем
- Автоматическое создание профиля
- Сохранение сессии
- Retry-логика для надёжности

### 🏠 Главная страница
- Кнопка "У меня вышло!" с анимацией
- **Шкала Бристольской формы стула** - выбор типа после нажатия кнопки
- Статистика (сегодня/неделя/всего)
- Уведомления от друзей в реальном времени

### 👥 Социальные функции
- Поиск пользователей по имени
- Подписка на друзей
- Список подписчиков и подписок
- Отписка в один клик

### 📰 Лента
- **Друзья** - история активности подписок с типом стула
- **Моя история** - персональная история событий
- Форматирование времени ("5 мин назад", "2 ч назад")

### 🔔 Уведомления
- Браузерные push-уведомления
- Получение уведомлений когда друг "сходил"
- Realtime обновления через Supabase

### ⚙️ Настройки
- Изменение имени пользователя
- Выбор языка (RU/EN/ZH/DE/ES)
- Статистика аккаунта
- Выход из системы

### 📱 PWA (Progressive Web App)
- Установка на Android и iPhone
- Работа офлайн
- Service Worker для кэширования
- Манифест приложения
- SVG иконка

## 🌍 Мультиязычность

Поддерживаемые языки:
- 🇷🇺 Русский
- 🇬🇧 English
- 🇨🇳 中文
- 🇩🇪 Deutsch
- 🇪🇸 Español

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
- `events` - события "походов" с типом по Бристольской шкале
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
- bristol_type (integer, 1-7) - тип по Бристольской шкале
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

## 📊 Бристольская шкала формы стула

После нажатия кнопки "У меня вышло!" появляется модальное окно с выбором типа:

- **Тип 1** ⚫ - Отдельные твёрдые комочки (запор)
- **Тип 2** 🟫 - Комковатая и плотная (лёгкий запор)
- **Тип 3** 🟤 - Как колбаска с трещинами (норма)
- **Тип 4** 🟢 - Гладкая колбаска (идеал)
- **Тип 5** 🟡 - Мягкие кусочки (склонность к диарее)
- **Тип 6** 🟠 - Пушистые кусочки (диарея)
- **Тип 7** 🔵 - Водянистый (сильная диарея)

## 📱 Установка PWA

### Android (Chrome)
1. Откройте сайт в Chrome
2. Меню (⋮) → "Установить приложение" или "Добавить на главный экран"
3. Иконка 💩 появится на рабочем столе!

### iPhone (Safari)
1. Откройте сайт в Safari
2. Кнопка "Поделиться" (□↑) → "На экран «Домой»"
3. Приложение появится на рабочем столе!

Подробнее в файле `PWA_INSTALL.md`

## 🌿 Именование веток и Pull Request

При создании веток и Pull Request используйте понятные названия:

### ✅ Правильно:
```bash
git checkout -b feat/add-bristol-scale
git commit -m "feat: add Bristol stool scale selection"
git push origin feat/add-bristol-scale
```

### ❌ Неправильно:
```bash
git checkout -b session-abc123xyz
```

### Примеры хороших названий веток:
- `feat/add-bristol-scale` - добавление Бристольской шкалы
- `feat/add-pwa-support` - добавление PWA поддержки
- `fix/auth-redirect` - исправление редиректа авторизации
- `docs/update-readme` - обновление документации
- `refactor/simplify-auth` - рефакторинг авторизации

### Примеры хороших Pull Request:
- "feat: add Bristol stool scale after button press"
- "feat: add PWA support and mobile icons"
- "fix: resolve session sync issue with Supabase"
- "docs: update installation instructions"

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
- **PWA**: vite-plugin-pwa + Workbox
- **i18n**: Собственная система переводов

## 🐛 Известные проблемы

- При первой регистрации может потребоваться обновление страницы
- Браузерные уведомления требуют разрешения пользователя
- На iOS PWA работает только через Safari

## 📝 Лицензия

MIT

## 👨‍💻 Автор

Evgeny Mayorov - https://github.com/evgenymayorov

---

**Важно**: Это шуточное приложение. Не используйте его для серьёзных целей! 😄💩
