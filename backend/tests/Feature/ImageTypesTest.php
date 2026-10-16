<?php

namespace Tests\Feature;

use App\Models\Event;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

// Batch 16: event posters and avatar photos take PNG and JPG only (like org logos)
class ImageTypesTest extends TestCase
{
    // Real 1x1 images, so the server sees genuine PNG / WebP content
    private function png(): UploadedFile
    {
        return UploadedFile::fake()->createWithContent('pic.png', base64_decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='));
    }

    private function webp(): UploadedFile
    {
        return UploadedFile::fake()->createWithContent('pic.webp', base64_decode(
            'UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA'));
    }

    public function test_posters_and_photos_take_png_but_not_webp(): void
    {
        Storage::fake('public');
        $org = $this->compSoc();
        $officer = $this->person($org, 'officer');
        $event = $this->inOrg($org, fn () => Event::create([
            'title' => 'Git Workshop', 'category' => 'Workshop', 'date' => now()->addWeek()->toDateString(),
            'time' => '13:00', 'location' => 'Room 304', 'mode' => 'F2F', 'capacity' => 30, 'status' => 'upcoming',
        ]));

        $this->actingIn($officer, $org)->post("/api/events/{$event->id}/poster", ['poster' => $this->webp()], ['Accept' => 'application/json'])
            ->assertStatus(422)->assertJsonValidationErrors('poster');
        $this->actingIn($officer, $org)->post("/api/events/{$event->id}/poster", ['poster' => $this->png()], ['Accept' => 'application/json'])
            ->assertOk();

        $this->actingIn($officer, $org)->post('/api/user/avatar/photo', ['photo' => $this->webp()], ['Accept' => 'application/json'])
            ->assertStatus(422)->assertJsonValidationErrors('photo');
        $this->actingIn($officer, $org)->post('/api/user/avatar/photo', ['photo' => $this->png()], ['Accept' => 'application/json'])
            ->assertOk()->assertJsonPath('avatar', 'photo');
    }
}
