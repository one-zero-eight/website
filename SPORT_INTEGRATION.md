# Интеграция спортивного раздела

Этот документ описывает интеграцию спортивного раздела из `frontend-prod` в основной проект `website-main`.

## Структура интеграции

### Маршруты
Спортивный раздел доступен по следующим маршрутам:
- `/sport/schedule` - Расписание занятий
- `/sport/clubs` - Список клубов
- `/sport/club/:clubId` - Детали клуба
- `/sport/history` - История занятий
- `/sport/fitness-test` - Фитнес-тесты
- `/sport/faq` - Часто задаваемые вопросы
- `/sport/fitness-session/:sessionId` - Детали фитнес-сессии

### Компоненты
Все компоненты из `frontend-prod` интегрированы в `src/components/sport/`:
- Страницы: `SchedulePage.tsx`, `ClubsPage.tsx`, `HistoryPage.tsx`, etc.
- Компоненты: `TopBar.tsx`, навигация, формы
- Утилиты: `hooks/`, `services/`, `store/`, `types/`, `utils/`

## Настройка поддомена

### 1. DNS настройки
Добавьте A-запись для поддомена:
```
sport.innohassle.ru. IN A <IP-адрес-сервера>
```

### 2. Nginx конфигурация
Используйте файл `nginx-sport.conf` для настройки nginx:

```bash
# Скопируйте конфигурацию
sudo cp nginx-sport.conf /etc/nginx/sites-available/sport.innohassle.ru

# Создайте символическую ссылку
sudo ln -s /etc/nginx/sites-available/sport.innohassle.ru /etc/nginx/sites-enabled/

# Проверьте конфигурацию
sudo nginx -t

# Перезапустите nginx
sudo systemctl reload nginx
```

### 3. SSL сертификат
Получите SSL сертификат для поддомена:
```bash
sudo certbot --nginx -d sport.innohassle.ru
```

## Развертывание

### 1. Сборка проекта
```bash
cd website-main
pnpm install
pnpm build
```

### 2. Развертывание на сервер
```bash
# Скопируйте собранные файлы
sudo cp -r dist/* /var/www/website-main/

# Установите правильные права
sudo chown -R www-data:www-data /var/www/website-main
sudo chmod -R 755 /var/www/website-main
```

### 3. Проверка
Откройте https://sport.innohassle.ru в браузере.

## Разработка

### Локальная разработка
```bash
# Запуск dev сервера
pnpm dev

# Доступ к спортивному разделу
http://localhost:3000/sport/schedule
```

### API прокси
В режиме разработки API запросы проксируются на `http://t9d.store/api/`.

## Зависимости

Добавлены следующие зависимости из `frontend-prod`:
- `axios` - HTTP клиент
- `date-fns` - Работа с датами
- `lucide-react` - Иконки
- `react-router-dom` - Маршрутизация (для совместимости)
- `zustand` - Управление состоянием

## Структура файлов

```
website-main/
├── src/
│   ├── app/routes/_with_menu/sport/
│   │   ├── index.tsx              # Редирект на schedule
│   │   ├── schedule.tsx           # Расписание
│   │   ├── clubs.tsx              # Клубы
│   │   ├── club.$clubId.tsx       # Детали клуба
│   │   ├── history.tsx            # История
│   │   ├── fitness-test.tsx       # Фитнес-тесты
│   │   ├── faq.tsx                # FAQ
│   │   └── fitness-session.$sessionId.tsx # Фитнес-сессия
│   └── components/sport/
│       ├── SportSchedulePage.tsx  # Обертка расписания
│       ├── SportClubsPage.tsx     # Обертка клубов
│       ├── SportNavigation.tsx    # Навигация
│       ├── SchedulePage.tsx       # Оригинальная страница
│       ├── ClubsPage.tsx          # Оригинальная страница
│       ├── components/            # Компоненты из frontend-prod
│       ├── hooks/                 # Хуки из frontend-prod
│       ├── services/              # API сервисы
│       ├── store/                 # Zustand store
│       ├── types/                 # TypeScript типы
│       └── utils/                 # Утилиты
├── nginx-sport.conf               # Nginx конфигурация
└── SPORT_INTEGRATION.md           # Эта документация
```

## Миграция данных

При необходимости миграции данных из старой системы:
1. Экспортируйте данные из `frontend-prod`
2. Импортируйте в новую систему через API
3. Обновите конфигурацию API endpoints

## Мониторинг

Рекомендуется настроить мониторинг:
- Логи nginx: `/var/log/nginx/access.log`
- Логи приложения: через systemd или PM2
- Мониторинг доступности: UptimeRobot или аналоги

## Безопасность

- Все запросы перенаправляются на HTTPS
- Настроены security headers в nginx
- API запросы проксируются через nginx
- Статические файлы кэшируются 