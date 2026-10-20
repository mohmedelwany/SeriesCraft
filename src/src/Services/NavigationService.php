<?php

declare(strict_types=1);

namespace SeriesCraft\Services;

class NavigationService
{
    /**
     * Resolves the navigation context including current position and adjacent posts.
     *
     * @param int $currentPostId The ID of the post currently being viewed.
     * @param array<int, array{id: int, title: string, part_order: int}> $parts Explicitly ordered series parts.
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
    public function getNavigationContext(int $currentPostId, array $parts): array
    {
        $totalParts = count($parts);
        $currentIndex = -1;

        // Reset numerical array indexes to guarantee predictable sequential iteration
        $sequentialParts = array_values($parts);

        foreach ($sequentialParts as $index => $part) {
            if ($part['id'] === $currentPostId) {
                $currentIndex = $index;
                break;
            }
        }

        if ($currentIndex === -1) {
            return [
                'current_part'   => 0,
                'total_parts'    => $totalParts,
                'position_label' => '',
                'is_first'       => false,
                'is_last'        => false,
                'previous_post'  => null,
                'next_post'      => null,
            ];
        }

        $currentPartNumber = $currentIndex + 1;
        $isFirst = ($currentIndex === 0);
        $isLast = ($currentIndex === $totalParts - 1);

        $previousPost = !$isFirst ? $sequentialParts[$currentIndex - 1] : null;
        $nextPost = !$isLast ? $sequentialParts[$currentIndex + 1] : null;

        return [
            'current_part'   => $currentPartNumber,
            'total_parts'    => $totalParts,
            'position_label' => sprintf('Part %d of %d', $currentPartNumber, $totalParts),
            'is_first'       => $isFirst,
            'is_last'        => $isLast,
            'previous_post'  => $previousPost,
            'next_post'      => $nextPost,
        ];
    }
}