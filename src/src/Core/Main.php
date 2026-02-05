<?php

namespace SeriesCraft\Core;

class Main {
    public function init() {
        // Initialize hooks here
        add_action('init', [$this, 'register_assets']);
        
        if (is_admin()) {
            (new \SeriesCraft\Admin\AdminPage())->init();
        }
    }

    public function register_assets() {
        // Register scripts and styles
    }
}
