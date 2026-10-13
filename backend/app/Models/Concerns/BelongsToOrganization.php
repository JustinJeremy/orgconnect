<?php

namespace App\Models\Concerns;

use App\Models\Organization;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// For rows that belong to one organization (events, hours, announcements...).
// While an org is selected, queries only see that org's rows and new rows are saved under it.
// This also makes /api/events/{id} of another org return 404.
trait BelongsToOrganization
{
    protected static function bootBelongsToOrganization(): void
    {
        static::addGlobalScope('organization', function (Builder $query) {
            if ($org = Organization::current()) {
                $query->where($query->getModel()->qualifyColumn('organization_id'), $org->id);
            }
        });

        static::creating(function ($model) {
            if (! $model->organization_id && ($org = Organization::current())) {
                $model->organization_id = $org->id;
            }
        });
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
