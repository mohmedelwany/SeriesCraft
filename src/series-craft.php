<?php
/*
* Plugin Name:       Series Craft
* Description:       Create ordered post series with a clean front-end table of contents and next/prev navigation to guide readers through multi-part articles.
* Version:           0.1.0
* Requires at least: 6.2
* Requires PHP:      7.4
* Author:            Mohamed Elwany
* Author URI:        mailto:dev.mohamedelwany@gmail.com
* License:           GPL v3 or later
* License URI:       https://www.gnu.org/licenses/gpl-3.0.html
* Text Domain:       series-craft
* Domain Path:       /languages
*/

if (!defined('ABSPATH')) exit;

require_once __DIR__ . '/Autoloader.php';
\SeriesCraft\Autoloader::register();