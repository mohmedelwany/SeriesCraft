<?php
/**
 * PHPUnit bootstrap file
 */

$root_autoloader = dirname(__DIR__) . '/vendor/autoload.php';
$src_autoloader  = dirname(__DIR__) . '/src/vendor/autoload.php';

if (file_exists($root_autoloader)) {
    require_once $root_autoloader;
} elseif (file_exists($src_autoloader)) {
    require_once $src_autoloader;
} else {
    throw new RuntimeException('Composer autoloader not found. Please run composer install.');
}

