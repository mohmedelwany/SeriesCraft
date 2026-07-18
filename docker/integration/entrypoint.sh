#!/usr/bin/env bash
# =============================================================================
# docker/integration/entrypoint.sh
#
# Container entry point for the integration test run.
# Called by docker-compose.yml; all variables come from the container env.
# =============================================================================
set -euo pipefail

echo "──────────────────────────────────────────────────────────"
echo "  PHP  : $(php -r 'echo PHP_VERSION;')"
echo "  WP   : ${WP_VERSION}"
echo "──────────────────────────────────────────────────────────"

# Install WordPress core (downloads core via SVN; no test library needed).
/app/docker/integration/install-wp-tests.sh \
    "${DB_NAME}" \
    "${DB_USER}" \
    "${DB_PASS}" \
    "${DB_HOST}" \
    "${WP_VERSION}"

# ---------------------------------------------------------------------------
# Make the plugin visible to WordPress.
# ---------------------------------------------------------------------------
PLUGINS_DIR="${WP_CORE_DIR:-/tmp/wordpress}/wp-content/plugins"
mkdir -p "${PLUGINS_DIR}"

PLUGIN_LINK="${PLUGINS_DIR}/series-craft"
if [[ ! -L "${PLUGIN_LINK}" ]]; then
    ln -sf /app/src "${PLUGIN_LINK}"
    echo "==> Symlinked plugin: ${PLUGIN_LINK} -> /app/src"
fi

# ---------------------------------------------------------------------------
# Create wp-config.php so WP-CLI can talk to WordPress.
# ---------------------------------------------------------------------------
echo "==> Creating wp-config.php..."

if [[ ! -f "${WP_CORE_DIR}/wp-config.php" ]]; then
    wp config create \
        --path="${WP_CORE_DIR}" \
        --dbname="${DB_NAME}" \
        --dbuser="${DB_USER}" \
        --dbpass="${DB_PASS}" \
        --dbhost="${DB_HOST}" \
        --skip-check \
        --allow-root
fi

# ---------------------------------------------------------------------------
# Install WordPress for real and activate the plugin via wp-cli.
# Tests run against this live install.
# ---------------------------------------------------------------------------
if ! wp core is-installed --path="${WP_CORE_DIR}" --allow-root; then
    echo "==> Installing WordPress..."
    wp core install \
        --path="${WP_CORE_DIR}" \
        --url="http://example.org" \
        --title="SeriesCraft Test Site" \
        --admin_user="admin" \
        --admin_password="password" \
        --admin_email="admin@example.org" \
        --skip-email \
        --allow-root
fi

echo "==> Activating SeriesCraft plugin..."
wp plugin activate series-craft --path="${WP_CORE_DIR}" --allow-root

# Run the integration suite.
exec vendor/bin/phpunit -c phpunit.integration.xml --colors=always