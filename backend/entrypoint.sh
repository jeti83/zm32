#!/bin/sh
set -e

/usr/local/bin/wait-for-it database:3306 --

# Check if there are any tables in the database
if TABLES=$(mysql --skip-ssl -h "$DB_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" -e "SHOW TABLES IN $MYSQL_DATABASE;" 2>/dev/null); then
    TABLES=$(echo "$TABLES" | sed -n '2,$p')

    if [ -z "$TABLES" ]; then
        echo "No tables found. Initializing database from scratch..."
        php bin/console doctrine:schema:create --no-interaction
        echo "Generating default articles..."
        php bin/console zm:generate-default-artikels
    else
        echo "Tables found. Checking if schema is already in sync..."
        set +e
        php bin/console doctrine:schema:validate --skip-mapping --no-interaction
        SCHEMA_STATUS=$?
        set -e

        if [ "$SCHEMA_STATUS" -eq 0 ]; then
            echo "Schema is already in sync. Skipping update."
        else
            echo "Schema is out of sync. Running update..."
            php bin/console doctrine:schema:update --force --complete --no-interaction
        fi
    fi
else
    echo "Failed to connect to the database."
    echo "DB_HOST: $DB_HOST"
    echo "MYSQL_USER: $MYSQL_USER"
    echo "MYSQL_DATABASE: $MYSQL_DATABASE"
    exit 1
fi

# Clear and warm up the cache
echo "Clearing and warming up the cache..."
php bin/console cache:clear --env=prod --no-debug
php bin/console cache:warmup --env=prod --no-debug

# Start PHP-FPM
exec php-fpm
