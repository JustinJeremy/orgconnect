<?php

namespace App\Mail;

use App\Models\Organization;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

// Emailed to whoever asked to register an org once the admin decides:
//   approved: the org's details, that they're its President, and the admin's message (if any)
//   rejected: the admin's reason, and that they can send a new request
// Delivery uses the MAIL_* settings (locally MAIL_MAILER=log writes it to storage/logs/laravel.log).
class OrgRequestDecided extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Organization $organization, public bool $approved, public ?string $note) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->approved
            ? "{$this->organization->short_name} is live on OrgConnect"
            : "Your request to register {$this->organization->short_name}");
    }

    public function content(): Content
    {
        $url = config('app.frontend_url');

        return new Content(view: 'mail.org-decided', with: [
            'org' => $this->organization,
            'approved' => $this->approved,
            'note' => $this->note,
            'president' => $this->organization->requester?->name,
            'appUrl' => rtrim($url, '/'),
        ]);
    }
}
