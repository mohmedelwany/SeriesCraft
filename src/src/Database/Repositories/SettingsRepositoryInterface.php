<?php
/**
 * Settings repository contract.
 *
 * @package SeriesCraft\Database\Repositories
 */

declare(strict_types=1);

namespace SeriesCraft\Database\Repositories;

/**
 * Interface SettingsRepositoryInterface
 *
 * Contract for accessing and persisting admin configuration settings.
 */
interface SettingsRepositoryInterface {

	/**
	 * Retrieve supported post types.
	 *
	 * @return array<int, string>
	 */
	public function get_supported_post_types(): array;

	/**
	 * Persist supported post types.
	 *
	 * @param array<int, string> $post_types Validated post types.
	 * @return bool
	 */
	public function set_supported_post_types( array $post_types ): bool;

	/**
	 * Retrieve default layout variant.
	 *
	 * @return string
	 */
	public function get_default_layout(): string;

	/**
	 * Persist default layout variant.
	 *
	 * @param string $layout Validated layout variant.
	 * @return bool
	 */
	public function set_default_layout( string $layout ): bool;
}
