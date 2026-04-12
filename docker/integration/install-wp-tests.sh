#!/usr/bin/env bash
# =============================================================================
# install-wp-tests.sh
#
# Downloads and configures the WordPress test library (wordpress-tests-lib)
# and a bare WordPress core installation inside the container.
#
# Usage:
#   install-wp-tests.sh <db-name> <db-user> <db-pass> <db-host> [wp-version]
#
# This mirrors the official WP plugin unit-test bootstrap script.
# =============================================================================

set -euo pipefail

DB_NAME=${1:-wordpress_test}
DB_USER=${2:-wp_test}
DB_PASS=${3:-wp_test}
DB_HOST=${4:-localhost}
WP_VERSION=${5:-latest}

WP_TESTS_DIR=${WP_TESTS_DIR:-/tmp/wordpress-tests-lib}
WP_CORE_DIR=${WP_CORE_DIR:-/tmp/wordpress}

# ---------------------------------------------------------------------------
# Resolve latest WP version from the API
# ---------------------------------------------------------------------------
if [[ "$WP_VERSION" == "latest" ]]; then
    WP_VERSION=$(curl -s https://api.wordpress.org/core/version-check/1.7/ \
        | grep -m 1 '"version"' \
        | sed 's/.*"version":"\([^"]*\)".*/\1/')
    echo "Resolved latest WP version: $WP_VERSION"
fi

# Major.Minor only (e.g. 6.7.1 → 6.7) for the SVN branch
WP_TAG="$WP_VERSION"

# ---------------------------------------------------------------------------
# Download WordPress core (only if not already present)
# ---------------------------------------------------------------------------
if [[ ! -d "$WP_CORE_DIR/wp-includes" ]]; then
    echo "==> Downloading WordPress $WP_VERSION core..."
    mkdir -p "$WP_CORE_DIR"
    svn co --quiet \
        "https://develop.svn.wordpress.org/tags/${WP_TAG}/src/" \
        "$WP_CORE_DIR" \
        || svn co --quiet \
            "https://develop.svn.wordpress.org/trunk/src/" \
            "$WP_CORE_DIR"
fi

# ---------------------------------------------------------------------------
# Download WordPress test library (only if not already present)
# ---------------------------------------------------------------------------
if [[ ! -d "$WP_TESTS_DIR/includes" ]]; then
    echo "==> Downloading WordPress test library for $WP_VERSION..."
    mkdir -p "$WP_TESTS_DIR"
    svn co --quiet \
        "https://develop.svn.wordpress.org/tags/${WP_TAG}/tests/phpunit/includes/" \
        "$WP_TESTS_DIR/includes" \
        || svn co --quiet \
            "https://develop.svn.wordpress.org/trunk/tests/phpunit/includes/" \
            "$WP_TESTS_DIR/includes"

    svn co --quiet \
        "https://develop.svn.wordpress.org/tags/${WP_TAG}/tests/phpunit/data/" \
        "$WP_TESTS_DIR/data" \
        || svn co --quiet \
            "https://develop.svn.wordpress.org/trunk/tests/phpunit/data/" \
            "$WP_TESTS_DIR/data"
fi

# ---------------------------------------------------------------------------
# Write wp-tests-config.php
# ---------------------------------------------------------------------------
if [[ -f "$WP_TESTS_DIR/wp-tests-config.php" ]] \
    && ! grep -q "WP_CONTENT_DIR" "$WP_TESTS_DIR/wp-tests-config.php"; then
    echo "==> Stale wp-tests-config.php detected (missing WP_CONTENT_DIR) — regenerating..."
    rm "$WP_TESTS_DIR/wp-tests-config.php"
fi

if [[ ! -f "$WP_TESTS_DIR/wp-tests-config.php" ]]; then
    echo "==> Writing wp-tests-config.php..."
    cat > "$WP_TESTS_DIR/wp-tests-config.php" <<PHP
<?php
/* Path to the WordPress codebase; no trailing slash. */
define( 'ABSPATH', '${WP_CORE_DIR}/' );

/* Test with WordPress debug mode. */
define( 'WP_DEBUG', true );

/* Database credentials */
define( 'DB_NAME',     '${DB_NAME}'  );
define( 'DB_USER',     '${DB_USER}'  );
define( 'DB_PASSWORD', '${DB_PASS}'  );
define( 'DB_HOST',     '${DB_HOST}'  );
define( 'DB_CHARSET',  'utf8'        );
define( 'DB_COLLATE',  ''            );

\$table_prefix = 'wptests_';

define( 'WP_TESTS_DOMAIN',      'example.org'           );
define( 'WP_TESTS_EMAIL',       'admin@example.org'     );
define( 'WP_TESTS_TITLE',       'Test WordPress Site'   );
define( 'WP_PHP_BINARY',        'php'                   );
define( 'WPLANG',               ''                      );

/* Explicit content dir so our plugin symlink is always found. */
define( 'WP_CONTENT_DIR', '${WP_CORE_DIR}/wp-content' );
define( 'WP_CONTENT_URL', 'http://example.org/wp-content' );
PHP
fi

echo "==> WordPress test environment ready."
