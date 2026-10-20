<?php

declare(strict_types=1);

namespace SeriesCraft\Views\Variants;

interface VariantViewInterface
{
    /**
     * Renders the HTML markup for the series posts layout.
     *
     * @param array<int, array{id: int, title: string, url: string, part_order: int, thumbnail: string|null}> $posts
     * @param int $currentPostId
     * @return string
     */
    public function render(array $posts, int $currentPostId): string;
}