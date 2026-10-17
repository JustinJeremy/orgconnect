<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

// The last message someone has read in a conversation (later ones count as unread)
class ConversationRead extends Model
{
    public $timestamps = false;

    protected $fillable = ['conversation_id', 'user_id', 'last_read_message_id'];
}
