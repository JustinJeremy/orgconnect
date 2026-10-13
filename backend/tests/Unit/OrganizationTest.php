<?php

namespace Tests\Unit;

use App\Models\Organization;
use PHPUnit\Framework\TestCase;

class OrganizationTest extends TestCase
{
    public function test_an_org_uses_its_own_tutoring_areas(): void
    {
        $org = new Organization(['tutoring_areas' => ['Python', 'Statistics']]);

        $this->assertSame(['Python', 'Statistics'], $org->tutoringAreas());
    }

    public function test_an_org_without_tutoring_areas_falls_back_to_the_defaults(): void
    {
        $this->assertSame(Organization::DEFAULT_TUTORING_AREAS, (new Organization)->tutoringAreas());
    }
}
