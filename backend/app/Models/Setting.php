<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

// Platform-wide switches the admin controls, stored as key/value pairs
class Setting extends Model
{
    // Students may edit their name, student ID, email, course and year (opened by the admin for a new school year)
    public const DETAILS_OPEN = 'details_open';

    protected $primaryKey = 'key';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = ['key', 'value'];

    public static function flag(string $key): bool
    {
        return static::find($key)?->value === '1';
    }

    public static function setFlag(string $key, bool $on): void
    {
        static::updateOrCreate(['key' => $key], ['value' => $on ? '1' : '0']);
    }
}
