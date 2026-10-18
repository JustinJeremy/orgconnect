<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\File\UploadedFile;

// A file PHP turned away (bigger than its upload limit) reaches the app as "no file", so the usual
// rules would say the field is required. Call this first to say it's too large instead.
class Uploads
{
    public static function ensureArrived(Request $request, string $field, string $limit): void
    {
        $upload = $request->files->get($field);
        if ($upload instanceof UploadedFile && ! $upload->isValid()) {
            throw ValidationException::withMessages([$field => in_array($upload->getError(), [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true)
                ? "That file is too large to upload. {$limit}" : "That file didn't upload. Please try again."]);
        }
    }
}
