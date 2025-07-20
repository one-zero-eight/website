#!/bin/bash

# Скрипт для развертывания спортивного раздела
# Использование: ./deploy-sport.sh [production|staging]

set -e

ENVIRONMENT=${1:-production}
DEPLOY_PATH="/var/www/website-main"
BACKUP_PATH="/var/www/backups/website-main-$(date +%Y%m%d-%H%M%S)"

echo "🚀 Начинаем развертывание спортивного раздела в окружении: $ENVIRONMENT"

# Проверяем, что мы в правильной директории
if [ ! -f "package.json" ]; then
    echo "❌ Ошибка: package.json не найден. Запустите скрипт из корня проекта website-main"
    exit 1
fi

# Создаем резервную копию
echo "📦 Создаем резервную копию..."
if [ -d "$DEPLOY_PATH" ]; then
    sudo mkdir -p /var/www/backups
    sudo cp -r "$DEPLOY_PATH" "$BACKUP_PATH"
    echo "✅ Резервная копия создана: $BACKUP_PATH"
fi

# Устанавливаем зависимости
echo "📦 Устанавливаем зависимости..."
pnpm install

# Собираем проект
echo "🔨 Собираем проект..."
pnpm build

# Проверяем, что сборка прошла успешно
if [ ! -d "dist" ]; then
    echo "❌ Ошибка: папка dist не создана после сборки"
    exit 1
fi

# Останавливаем nginx для обновления файлов
echo "🛑 Останавливаем nginx..."
sudo systemctl stop nginx

# Копируем файлы
echo "📁 Копируем файлы..."
sudo mkdir -p "$DEPLOY_PATH"
sudo cp -r dist/* "$DEPLOY_PATH/"

# Устанавливаем правильные права
echo "🔐 Устанавливаем права доступа..."
sudo chown -R www-data:www-data "$DEPLOY_PATH"
sudo chmod -R 755 "$DEPLOY_PATH"

# Копируем конфигурацию nginx
echo "⚙️ Настраиваем nginx..."
sudo cp nginx-sport.conf /etc/nginx/sites-available/sport.innohassle.ru

# Создаем символическую ссылку, если её нет
if [ ! -L "/etc/nginx/sites-enabled/sport.innohassle.ru" ]; then
    sudo ln -s /etc/nginx/sites-available/sport.innohassle.ru /etc/nginx/sites-enabled/
fi

# Проверяем конфигурацию nginx
echo "🔍 Проверяем конфигурацию nginx..."
if ! sudo nginx -t; then
    echo "❌ Ошибка в конфигурации nginx"
    sudo systemctl start nginx
    exit 1
fi

# Запускаем nginx
echo "🚀 Запускаем nginx..."
sudo systemctl start nginx

# Проверяем статус nginx
if sudo systemctl is-active --quiet nginx; then
    echo "✅ Nginx успешно запущен"
else
    echo "❌ Ошибка запуска nginx"
    exit 1
fi

# Получаем SSL сертификат (только для production)
if [ "$ENVIRONMENT" = "production" ]; then
    echo "🔒 Получаем SSL сертификат..."
    if command -v certbot &> /dev/null; then
        sudo certbot --nginx -d sport.innohassle.ru --non-interactive --agree-tos --email admin@innohassle.ru
    else
        echo "⚠️ Certbot не установлен. Установите SSL сертификат вручную"
    fi
fi

# Проверяем доступность сайта
echo "🌐 Проверяем доступность сайта..."
sleep 5

if curl -f -s "https://sport.innohassle.ru" > /dev/null 2>&1; then
    echo "✅ Сайт доступен по адресу: https://sport.innohassle.ru"
elif curl -f -s "http://sport.innohassle.ru" > /dev/null 2>&1; then
    echo "✅ Сайт доступен по адресу: http://sport.innohassle.ru"
    echo "⚠️ Рекомендуется настроить SSL сертификат"
else
    echo "❌ Сайт недоступен"
    exit 1
fi

echo "🎉 Развертывание завершено успешно!"
echo "📊 Статистика:"
echo "   - Время развертывания: $(date)"
echo "   - Окружение: $ENVIRONMENT"
echo "   - Резервная копия: $BACKUP_PATH"
echo "   - Путь развертывания: $DEPLOY_PATH"

# Очистка старых резервных копий (оставляем только последние 5)
echo "🧹 Очищаем старые резервные копии..."
sudo find /var/www/backups -name "website-main-*" -type d -mtime +7 -exec rm -rf {} \; 2>/dev/null || true

echo "✨ Все готово!" 