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

# Install the WordPress test library (downloads core + test lib via SVN).
/app/docker/integration/install-wp-tests.sh \
    "${DB_NAME}" \
    "${DB_USER}" \
    "${DB_PASS}" \
    "${DB_HOST}" \
    "${WP_VERSION}"

# ---------------------------------------------------------------------------
# Make the plugin visible to WordPress.
#
# WP loads active_plugins from WP_CONTENT_DIR/plugins/<slug>/<main-file>.php.
# The test environment's WP_CONTENT_DIR defaults to $WP_CORE_DIR/wp-content/.
# We symlink our plugin source directory there so WP can find and boot it.
# ---------------------------------------------------------------------------
PLUGINS_DIR="${WP_CORE_DIR:-/tmp/wordpress}/wp-content/plugins"
mkdir -p "${PLUGINS_DIR}"

PLUGIN_LINK="${PLUGINS_DIR}/series-craft"
if [[ ! -L "${PLUGIN_LINK}" ]]; then
    ln -sf /app/src "${PLUGIN_LINK}"
    echo "==> Symlinked plugin: ${PLUGIN_LINK} -> /app/src"
fi

# Run the integration suite.
exec vendor/bin/phpunit -c phpunit.integration.xml --colors=always
