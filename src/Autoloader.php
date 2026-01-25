<?php

namespace SeriesCraft;

class Autoloader
{
    public static function register($prepend = false)
    {

    }

    public static function autoload($class)
    {
        if (strpos($class, 'SeriesCraft\\') !== 0) {
            return;
        }

        if (
            is_file(
                $file = dirname(__FILE__)
                    . '/class-'
                    . strtolower(str_replace(
                        array('_', "\0"), array('-', ''), $class
                        ) . '.php')
            )
        ) {
            require_once $file;
        }
    }
}