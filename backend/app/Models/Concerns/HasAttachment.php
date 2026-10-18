<?php

namespace App\Models\Concerns;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;

// One photo or file on a message or an announcement (columns attachment_path/name/size/type).
// Stored on the public disk under a random name; people get it through a signed link that works
// until the end of the next day (FileController checks the signature), so only someone who could
// see the message or announcement has a working link.
trait HasAttachment
{
    // Photos (shown in place) and common school files (downloaded). No SVG or HTML: they can carry scripts.
    public const ATTACHMENT_RULES = ['nullable', 'file', 'mimes:png,jpg,jpeg,pdf,doc,docx,xls,xlsx,ppt,pptx,txt,csv,zip', 'max:10240'];

    public function attach(UploadedFile $file, string $folder): void
    {
        $this->deleteAttachment();
        $image = in_array($file->getMimeType(), ['image/png', 'image/jpeg'], true);
        $this->forceFill([
            'attachment_path' => $file->storeAs($folder, Str::random(40).'.'.strtolower($file->getClientOriginalExtension()), 'public'),
            'attachment_name' => Str::limit($file->getClientOriginalName(), 120, ''),
            'attachment_size' => $file->getSize(),
            'attachment_type' => $image ? 'image' : 'file',
        ])->save();
    }

    public function deleteAttachment(): void
    {
        if ($this->attachment_path) {
            Storage::disk('public')->delete($this->attachment_path);
            $this->forceFill(['attachment_path' => null, 'attachment_name' => null, 'attachment_size' => null, 'attachment_type' => null])->save();
        }
    }

    // { name, size, type: image|file, url } or null. The link stays the same all day, so browsers cache it.
    public function attachmentData(string $route): ?array
    {
        if (! $this->attachment_path) {
            return null;
        }
        $signed = URL::temporarySignedRoute($route, now()->addDay()->endOfDay(), ['id' => $this->id], absolute: false);

        return [
            'name' => $this->attachment_name,
            'size' => $this->attachment_size,
            'type' => $this->attachment_type,
            'url' => url($signed),
        ];
    }
}
