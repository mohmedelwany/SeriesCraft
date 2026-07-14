<?php

/**
 * Lightweight editor stubs for WordPress PHPUnit integration tests.
 *
 * Intelephense cannot resolve WP_UnitTestCase and related helpers unless the
 * WordPress test bootstrap has been executed. These stubs only improve static
 * analysis for the editor and are not intended to be loaded by PHPUnit.
 */

if (! class_exists('WP_UnitTestCase', false)) {
    abstract class WP_UnitTestCase extends \PHPUnit\Framework\TestCase
    {
        /**
         * Return a simple factory stub used by integration tests.
         */
        public function factory(): WP_UnitTest_Factory
        {
            return new WP_UnitTest_Factory();
        }
    }

    class WP_UnitTest_Factory
    {
        /**
         * Generic post factory helper.
         *
         * @var object
         */
        public $post;

        public function __construct()
        {
            $this->post = new class() {
                /**
                 * Create a post stub for static analysis.
                 *
                 * @param array<string, mixed> $args
                 */
                public function create(array $args = []): int
                {
                    return 1;
                }
            };
        }
    }
}
