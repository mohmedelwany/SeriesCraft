<?php
/**
 * NavigationService definition.
 *
 * @package SeriesCraft\Services
 */

declare(strict_types=1);

namespace SeriesCraft\Services;

/**
 * Class NavigationService
 *
 * Handles sequence calculations and previous/next navigation within a series.
 */
class NavigationService {

	/**
	 * Resolves the navigation context including current position and adjacent posts.
	 *
	 * @param int                                                        $current_post_id The ID of the post currently being viewed.
	 * @param array<int, array{id: int, title: string, part_order: int}> $parts           Explicitly ordered series parts.
	 * @return array{
	 *     current_part: int,
	 *     total_parts: int,
	 *     position_label: string,
	 *     is_first: bool,
	 *     is_last: bool,
	 *     previous_post: array{id: int, title: string, part_order: int}|null,
	 *     next_post: array{id: int, title: string, part_order: int}|null
	 * }
	 */
	public function get_navigation_context( int $current_post_id, array $parts ): array {
		$total_parts   = count( $parts );
		$current_index = -1;

		// Reset numerical array indexes to guarantee predictable sequential iteration.
		$sequential_parts = array_values( $parts );

		foreach ( $sequential_parts as $index => $part ) {
			if ( $part['id'] === $current_post_id ) {
				$current_index = $index;
				break;
			}
		}

		if ( -1 === $current_index ) {
			return array(
				'current_part'   => 0,
				'total_parts'    => $total_parts,
				'position_label' => '',
				'is_first'       => false,
				'is_last'        => false,
				'previous_post'  => null,
				'next_post'      => null,
			);
		}

		$current_part_number = $current_index + 1;
		$is_first            = ( 0 === $current_index );
		$is_last             = ( $current_index === $total_parts - 1 );

		$previous_post = ! $is_first ? $sequential_parts[ $current_index - 1 ] : null;
		$next_post     = ! $is_last ? $sequential_parts[ $current_index + 1 ] : null;

		return array(
			'current_part'   => $current_part_number,
			'total_parts'    => $total_parts,
			'position_label' => sprintf( 'Part %d of %d', $current_part_number, $total_parts ),
			'is_first'       => $is_first,
			'is_last'        => $is_last,
			'previous_post'  => $previous_post,
			'next_post'      => $next_post,
		);
	}

	/**
	 * Magic caller for camelCase method compatibility.
	 *
	 * @param string $name      Method name.
	 * @param array  $arguments Method arguments.
	 * @return mixed
	 * @throws \BadMethodCallException If method does not exist.
	 */
	public function __call( string $name, array $arguments ) {
		if ( 'getNavigationContext' === $name ) {
			return $this->get_navigation_context( ...$arguments );
		}

		// phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped
		throw new \BadMethodCallException( sprintf( 'Call to undefined method %s::%s()', __CLASS__, $name ) );
	}
}
