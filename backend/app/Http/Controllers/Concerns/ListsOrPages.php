<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

trait ListsOrPages
{
    // Without ?page: the whole list (the dashboard needs every row for its totals).
    // With ?page=N (&perPage=M, at most 50): one page + { page, lastPage, total, perPage }.
    protected function listOrPage(Request $request, Builder $query, callable $toFrontend)
    {
        if (! $request->has('page')) {
            return $query->get()->map($toFrontend)->values();
        }

        $perPage = min(max((int) $request->input('perPage', 10), 1), 50);
        $page = $query->paginate($perPage);

        return [
            'data' => collect($page->items())->map($toFrontend)->values(),
            'meta' => [
                'page' => $page->currentPage(),
                'lastPage' => $page->lastPage(),
                'total' => $page->total(),
                'perPage' => $page->perPage(),
            ],
        ];
    }

    // ?search=words → rows where any of the given columns contains them
    protected function search(Request $request, Builder $query, array $columns, array $relations = []): void
    {
        $words = trim((string) $request->input('search'));
        if ($words === '') {
            return;
        }

        $like = '%'.addcslashes($words, '%_\\').'%';
        $query->where(function (Builder $q) use ($columns, $relations, $like) {
            foreach ($columns as $column) {
                $q->orWhere($column, 'like', $like);
            }
            foreach ($relations as $relation => $column) {
                $q->orWhereHas($relation, fn (Builder $r) => $r->where($column, 'like', $like));
            }
        });
    }
}
