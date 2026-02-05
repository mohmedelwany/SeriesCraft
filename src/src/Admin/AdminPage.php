<?php

namespace SeriesCraft\Admin;

class AdminPage {
    public function init() {
        add_action('admin_menu', [$this, 'add_menu_page']);
    }

    public function add_menu_page() {
        add_menu_page(
            __('Series Craft', 'series-craft'),
            __('Series Craft', 'series-craft'),
            'manage_options',
            'series-craft',
            [$this, 'render_admin_page'],
            'dashicons-list-view'
        );
    }

    public function render_admin_page() {
        echo '<div class="wrap"><h1>' . esc_html__('Series Craft', 'series-craft') . '</h1></div>';
    }
}
