<?php

declare(strict_types=1);

namespace SeriesCraft\Tests\Unit\Services;

use Brain\Monkey;
use PHPUnit\Framework\TestCase;
use SeriesCraft\Services\NavigationService;

class NavigationServiceTest extends TestCase
{
    private NavigationService $navigationService;

    protected function setUp(): void
    {
        parent::setUp();
        Monkey\setUp();

        $this->navigationService = new NavigationService();
    }

    protected function tearDown(): void
    {
        Monkey\tearDown();
        parent::tearDown();
    }

    /**
     * @return array<int, array{id: int, title: string, part_order: int}>
     */
    private function getSampleOrderedParts(): array
    {
        return [
            ['id' => 10, 'title' => 'Introduction to Architecture', 'part_order' => 1],
            ['id' => 20, 'title' => 'Database Schemas and Junction Tables', 'part_order' => 2],
            ['id' => 30, 'title' => 'Building Secure REST Controllers', 'part_order' => 3],
            ['id' => 40, 'title' => 'Frontend Views and Dynamic Layouts', 'part_order' => 4],
        ];
    }

    public function testGetNavigationContextForMiddlePost(): void
    {
        $parts = $this->getSampleOrderedParts();
        $currentPostId = 20;

        $context = $this->navigationService->getNavigationContext($currentPostId, $parts);

        $this->assertSame(2, $context['current_part']);
        $this->assertSame(4, $context['total_parts']);
        $this->assertSame('Part 2 of 4', $context['position_label']);
        $this->assertFalse($context['is_first']);
        $this->assertFalse($context['is_last']);

        $this->assertNotNull($context['previous_post']);
        $this->assertSame(10, $context['previous_post']['id']);
        $this->assertSame('Introduction to Architecture', $context['previous_post']['title']);

        $this->assertNotNull($context['next_post']);
        $this->assertSame(30, $context['next_post']['id']);
        $this->assertSame('Building Secure REST Controllers', $context['next_post']['title']);
    }

    public function testGetNavigationContextForFirstPostHasNoPrevious(): void
    {
        $parts = $this->getSampleOrderedParts();
        $currentPostId = 10;

        $context = $this->navigationService->getNavigationContext($currentPostId, $parts);

        $this->assertSame(1, $context['current_part']);
        $this->assertSame(4, $context['total_parts']);
        $this->assertSame('Part 1 of 4', $context['position_label']);
        $this->assertTrue($context['is_first']);
        $this->assertFalse($context['is_last']);

        $this->assertNull($context['previous_post']);
        $this->assertNotNull($context['next_post']);
        $this->assertSame(20, $context['next_post']['id']);
    }

    public function testGetNavigationContextForLastPostHasNoNext(): void
    {
        $parts = $this->getSampleOrderedParts();
        $currentPostId = 40;

        $context = $this->navigationService->getNavigationContext($currentPostId, $parts);

        $this->assertSame(4, $context['current_part']);
        $this->assertSame(4, $context['total_parts']);
        $this->assertSame('Part 4 of 4', $context['position_label']);
        $this->assertFalse($context['is_first']);
        $this->assertTrue($context['is_last']);

        $this->assertNotNull($context['previous_post']);
        $this->assertSame(30, $context['previous_post']['id']);
        $this->assertNull($context['next_post']);
    }

    public function testGetNavigationContextReturnsEmptyStateWhenPostNotFound(): void
    {
        $parts = $this->getSampleOrderedParts();
        $currentPostId = 999;

        $context = $this->navigationService->getNavigationContext($currentPostId, $parts);

        $this->assertSame(0, $context['current_part']);
        $this->assertSame(4, $context['total_parts']);
        $this->assertSame('', $context['position_label']);
        $this->assertNull($context['previous_post']);
        $this->assertNull($context['next_post']);
        $this->assertFalse($context['is_first']);
        $this->assertFalse($context['is_last']);
    }
}