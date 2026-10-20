<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

// What a text field may contain, so each one only takes what it's for
// (the same patterns are in frontend/src/utils/validation.js).
//   TextFormat::personName('Full name')  -> letters, spaces and . , ' -  (Ma. Clara Dela Cruz-O'Neil, Jr.)
//   TextFormat::course()                 -> letters only, like BSIT or BSCpE
//   TextFormat::orgName()                -> words, may include numbers and . , & ' - ( ) /
//   TextFormat::shortName()              -> letters and numbers, like JPCS or CS2
//   TextFormat::college()                -> letters, spaces and . , & ' - ( )
//   TextFormat::words('Title')           -> any text, but with words in it, not only numbers or symbols
class TextFormat implements ValidationRule
{
    public const PERSON_NAME = "/^\\p{L}[\\p{L}\\p{M} .,'’-]*$/u";
    public const COURSE = '/^\\p{L}[\\p{L} ]*$/u';
    public const ORG_NAME = "/^(?=.*\\p{L})[\\p{L}\\p{M}\\p{N} .,&'’()\\/–—-]+$/u";
    public const SHORT_NAME = '/^(?=.*\\p{L})[\\p{L}\\p{N}][\\p{L}\\p{N} &-]*$/u';
    public const COLLEGE = "/^\\p{L}[\\p{L}\\p{M} .,&'’()-]*$/u";
    public const WORDS = '/\\p{L}/u';

    public const YEAR_LEVELS = ['1st year', '2nd year', '3rd year', '4th year'];

    public function __construct(private string $pattern, private string $message) {}

    public static function personName(string $label = 'Name'): self
    {
        return new self(self::PERSON_NAME, "{$label} can only have letters, spaces and . , ' - (no numbers or symbols).");
    }

    public static function course(): self
    {
        return new self(self::COURSE, 'A course can only have letters, like BSIT or BSCpE.');
    }

    public static function orgName(): self
    {
        return new self(self::ORG_NAME, "Organization name needs letters and can only have numbers, spaces and . , & ' - ( ) /.");
    }

    public static function shortName(): self
    {
        return new self(self::SHORT_NAME, 'Short name can only have letters and numbers, like JPCS.');
    }

    public static function college(): self
    {
        return new self(self::COLLEGE, "College can only have letters, spaces and . , & ' - ( ) (no numbers).");
    }

    public static function words(string $label): self
    {
        return new self(self::WORDS, "{$label} needs words, not only numbers or symbols.");
    }

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (is_string($value) && $value !== '' && ! preg_match($this->pattern, $value)) {
            $fail($this->message);
        }
    }
}
