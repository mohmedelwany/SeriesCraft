<?php

declare(strict_types=1);

namespace SeriesCraft\Tests\Unit\Services;

use Brain\Monkey;
use Brain\Monkey\Functions;
use PHPUnit\Framework\TestCase;
use SeriesCraft\Services\ThumbnailResolver;

class ThumbnailResolverTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Monkey\setUp();
    }

    protected function tearDown(): void
    {
        Monkey\tearDown();
        parent::tearDown();
    }

    public function testResolvesPostThumbnailFromFeaturedImage(): void
    {
        Functions\stubs([
            'get_post_thumbnail_id'       => static fn (int $id): int => 123,
            'wp_get_attachment_image_url' => static fn (int $id, string $size): string => 'https://example.com/uploads/featured.jpg',
        ]);

        $url = ThumbnailResolver::resolve_post_image(10);
        $this->assertSame('https://example.com/uploads/featured.jpg', $url);
    }

    public function testResolvesImageFromGutenbergImageBlockAttrsId(): void
    {
        Functions\stubs([
            'get_post_thumbnail_id'       => static fn (int $id): int => 0,
            'has_blocks'                  => static fn (string $content): bool => true,
            'parse_blocks'                => static fn (string $content): array => [
                [
                    'blockName'   => 'core/image',
                    'attrs'       => ['id' => 456],
                    'innerBlocks' => [],
                    'innerHTML'   => '<figure class="wp-block-image"></figure>',
                ],
            ],
            'wp_get_attachment_image_url' => static fn (int $id, string $size): string => 'https://example.com/uploads/block-image.jpg',
        ]);

        $content = '<!-- wp:image {"id":456} --><figure class="wp-block-image"></figure><!-- /wp:image -->';
        $url = ThumbnailResolver::resolve_post_image(10, $content);
        $this->assertSame('https://example.com/uploads/block-image.jpg', $url);
    }

    public function testResolvesImageFromGutenbergImageBlockDirectUrl(): void
    {
        Functions\stubs([
            'get_post_thumbnail_id' => static fn (int $id): int => 0,
            'has_blocks'            => static fn (string $content): bool => true,
            'parse_blocks'          => static fn (string $content): array => [
                [
                    'blockName'   => 'core/image',
                    'attrs'       => ['url' => 'https://example.com/direct-url.png'],
                    'innerBlocks' => [],
                ],
            ],
        ]);

        $content = '<!-- wp:image {"url":"https://example.com/direct-url.png"} -->';
        $url = ThumbnailResolver::resolve_post_image(10, $content);
        $this->assertSame('https://example.com/direct-url.png', $url);
    }

    public function testResolvesImageFromNestedInnerBlocks(): void
    {
        Functions\stubs([
            'get_post_thumbnail_id' => static fn (int $id): int => 0,
            'has_blocks'            => static fn (string $content): bool => true,
            'parse_blocks'          => static fn (string $content): array => [
                [
                    'blockName'   => 'core/columns',
                    'attrs'       => [],
                    'innerBlocks' => [
                        [
                            'blockName'   => 'core/column',
                            'attrs'       => [],
                            'innerBlocks' => [
                                [
                                    'blockName'   => 'core/cover',
                                    'attrs'       => ['url' => 'https://example.com/cover-bg.jpg'],
                                    'innerBlocks' => [],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ]);

        $url = ThumbnailResolver::resolve_post_image(10, 'dummy content');
        $this->assertSame('https://example.com/cover-bg.jpg', $url);
    }

    public function testResolvesImageFromMediaTextBlock(): void
    {
        Functions\stubs([
            'get_post_thumbnail_id' => static fn (int $id): int => 0,
            'has_blocks'            => static fn (string $content): bool => true,
            'parse_blocks'          => static fn (string $content): array => [
                [
                    'blockName'   => 'core/media-text',
                    'attrs'       => ['mediaUrl' => 'https://example.com/media-text.jpg'],
                    'innerBlocks' => [],
                ],
            ],
        ]);

        $url = ThumbnailResolver::resolve_post_image(10, 'dummy content');
        $this->assertSame('https://example.com/media-text.jpg', $url);
    }

    public function testResolvesImageFromWpImageCommentJsonFallback(): void
    {
        Functions\stubs([
            'get_post_thumbnail_id' => static fn (int $id): int => 0,
            'has_blocks'            => static fn (string $content): bool => false,
        ]);

        $content = '<p>Text before</p><!-- wp:image {"url":"https://example.com/json-extracted.jpg"} --><p>After</p>';
        $url = ThumbnailResolver::resolve_post_image(10, $content);
        $this->assertSame('https://example.com/json-extracted.jpg', $url);
    }

    public function testResolvesImageFromRawImgTagFallback(): void
    {
        Functions\stubs([
            'get_post_thumbnail_id' => static fn (int $id): int => 0,
            'has_blocks'            => static fn (string $content): bool => false,
        ]);

        $content = '<div class="custom-html"><img src="https://example.com/raw-tag.png" alt="Test" /></div>';
        $url = ThumbnailResolver::resolve_post_image(10, $content);
        $this->assertSame('https://example.com/raw-tag.png', $url);
    }

    public function testReturnsEmptyStringWhenNoImageFound(): void
    {
        Functions\stubs([
            'get_post_thumbnail_id' => static fn (int $id): int => 0,
            'has_blocks'            => static fn (string $content): bool => false,
        ]);

        $content = '<p>Just a simple text paragraph with no images.</p>';
        $url = ThumbnailResolver::resolve_post_image(10, $content);
        $this->assertSame('', $url);
    }
}
