# 📤 Инструкция по пушу изменений на GitHub

## 🌿 Шаг 1: Создайте ветку с понятным названием

```bash
# Создайте новую ветку
git checkout -b feat/add-bristol-scale

# Или если уже есть изменения
git checkout -b feat/add-bristol-scale-and-pwa
```

### ✅ Правильные названия веток:
- `feat/add-bristol-scale` - добавление Бристольской шкалы
- `feat/add-pwa-support` - добавление PWA поддержки
- `feat/mobile-navigation` - мобильная навигация
- `fix/auth-sync-issue` - исправление проблемы синхронизации
- `docs/update-readme` - обновление документации

### ❌ Неправильные названия:
- `session-abc123xyz` - технический ID сессии
- `temp` - непонятно
- `test` - непонятно

## 📝 Шаг 2: Закоммитьте изменения

```bash
# Добавьте все изменения
git add .

# Закоммитьте с понятным сообщением
git commit -m "feat: add Bristol stool scale selection after button press"
```

### ✅ Правильные сообщения коммитов:
- `feat: add Bristol stool scale selection`
- `feat: add PWA support with service worker`
- `fix: resolve profile sync issue`
- `docs: update installation instructions`
- `refactor: simplify auth flow`

### ❌ Неправильные сообщения:
- `update` - непонятно
- `fix` - что исправлено?
- `wip` - work in progress, но что?

## 🚀 Шаг 3: Запушьте ветку

```bash
# Запушьте ветку в репозиторий
git push origin feat/add-bristol-scale
```

## 🔀 Шаг 4: Создайте Pull Request

1. Откройте GitHub репозиторий
2. Нажмите **"Compare & pull request"**
3. Заполните форму:

### ✅ Правильный Pull Request:

**Title:**
```
feat: add Bristol stool scale and improve mobile navigation
```

**Description:**
```markdown
## Что добавлено

### 🎯 Бристольская шкала
- Добавлено модальное окно после нажатия кнопки "У меня вышло!"
- 7 типов стула по Бристольской шкале
- Цветовая индикация (красный/зелёный/оранжевый)
- Сохранение типа в базу данных
- Отображение типа в ленте событий

### 📱 Мобильная навигация
- 4 вкладки внизу экрана
- Вкладка "Лента" с историей друзей и своей историей
- Форматирование времени ("5 мин назад")

### 🌍 Мультиязычность
- Переводы для 5 языков (RU/EN/ZH/DE/ES)
- Все новые тексты переведены

### 📊 База данных
- Добавлено поле `bristol_type` в таблицу `events`
- Обновлён SQL-скрипт

## Как тестировать

1. Нажмите кнопку "У меня вышло!"
2. Выберите тип стула в модальном окне
3. Проверьте отображение в ленте
4. Проверьте переключение языков

## Скриншоты

[Добавьте скриншоты если есть]

## Checklist

- [x] Код работает локально
- [x] Добавлены переводы для всех языков
- [x] Обновлён SQL-скрипт
- [x] Проект пересобран (npm run build)
- [x] README обновлён
```

### ❌ Неправильный Pull Request:

**Title:**
```
update
```

**Description:**
```
поправил
```

## 🎯 Пример полного workflow

```bash
# 1. Создайте ветку
git checkout -b feat/add-bristol-scale

# 2. Внесите изменения в код

# 3. Добавьте и закоммитьте
git add .
git commit -m "feat: add Bristol stool scale selection after button press"

# 4. Запушьте
git push origin feat/add-bristol-scale

# 5. Создайте Pull Request на GitHub
# Title: feat: add Bristol stool scale selection
# Description: [подробное описание как выше]
```

## 📋 Чек-лист перед пушем

- [ ] Ветка имеет понятное название
- [ ] Коммиты имеют понятные сообщения
- [ ] Код работает локально
- [ ] Проект пересобран (`npm run build`)
- [ ] SQL-скрипт обновлён (если менялась БД)
- [ ] README обновлён (если нужно)
- [ ] Нет лишних файлов (node_modules, .env, и т.д.)

## 🔍 Проверка перед созданием PR

1. Откройте GitHub
2. Перейдите в ветку
3. Проверьте **Files changed**
4. Убедитесь что нет случайных изменений
5. Проверьте что все файлы на месте

## 💡 Советы

- Создавайте **маленькие PR** с одной фичей
- Пишите **подробное описание** что и зачем
- Добавляйте **скриншоты** для UI изменений
- Используйте **checklist** в описании
- Отвечайте на **комментарии** ревьюеров

---

**Удачи с пушем!** 🚀💩
