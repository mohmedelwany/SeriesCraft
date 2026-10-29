<?php
/**
 * PHPUnit bootstrap file
 */

$is_integration = false;
if (isset($_SERVER['argv']) && is_array($_SERVER['argv'])) {
    foreach ($_SERVER['argv'] as $arg) {
        if (strpos($arg, 'Integration') !== false || strpos($arg, 'integration') !== false) {
            $is_integration = true;
            break;
        }
    }
}

if ($is_integration) {
    require_once __DIR__ . '/Integration/bootstrap.php';
    return;
}

$root_autoloader = dirname(__DIR__) . '/vendor/autoload.php';
$src_autoloader  = dirname(__DIR__) . '/src/vendor/autoload.php';

if (file_exists($root_autoloader)) {
    require_once $root_autoloader;
} elseif (file_exists($src_autoloader)) {
    require_once $src_autoloader;
} else {
    throw new RuntimeException('Composer autoloader not found. Please run composer install.');
}

if (!class_exists('wpdb')) {
    class wpdb {
        public string $prefix = 'wp_';
        public string $posts = 'wp_posts';
        public string $term_relationships = 'wp_term_relationships';
        public string $term_taxonomy = 'wp_term_taxonomy';
        public function get_results($query) {}
        public function get_var($query) {}
        public function insert($table, $data, $format = null) {}
        public function update($table, $data, $where, $format = null, $where_format = null) {}
        public function delete($table, $where, $where_format = null) {}
        public function query($query) {}
        public function prepare($query, ...$args) { return $query; }
    }
}

if (!class_exists('WP_REST_Controller')) {
    class WP_REST_Controller {
        protected $namespace;
        protected $rest_base;
    }
}

if (!class_exists('WP_REST_Response')) {
    class WP_REST_Response {
        public $data;
        public $status;
        public function __construct($data = null, $status = 200) {
            $this->data = $data;
            $this->status = $status;
        }
        public function get_data() { return $this->data; }
        public function get_status() { return $this->status; }
    }
}

if (!class_exists('WP_REST_Server')) {
    class WP_REST_Server {
        public const READABLE = 'GET';
        public const CREATABLE = 'POST';
    }
}

if (!class_exists('WP_Error')) {
    class WP_Error {
        public string $code;
        public string $message;
        public $data;
        public function __construct(string $code = '', string $message = '', $data = '') {
            $this->code = $code;
            $this->message = $message;
            $this->data = $data;
        }
        public function get_error_code(): string {
            return $this->code;
        }
        public function get_error_message(): string {
            return $this->message;
        }
        public function get_error_data() {
            return $this->data;
        }
    }
}

if (!class_exists('WP_REST_Request')) {
    class WP_REST_Request {
        private array $params = [];
        private array $json_params = [];
        public function __construct(array $params = [], array $json_params = []) {
            $this->params = $params;
            $this->json_params = $json_params;
        }
        public function get_param(string $key) {
            return $this->params[$key] ?? ($this->json_params[$key] ?? null);
        }
        public function set_param(string $key, $value): void {
            $this->params[$key] = $value;
        }
        public function get_params(): array {
            return $this->params;
        }
        public function get_json_params(): array {
            return $this->json_params;
        }
        public function set_json_params(array $params): void {
            $this->json_params = $params;
        }
    }
}
