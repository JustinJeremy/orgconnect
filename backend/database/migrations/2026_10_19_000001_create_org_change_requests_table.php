<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// A President's request to change the org's details (name, description, courses...).
// Nothing changes until the platform admin approves it.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('org_change_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('requested_by')->nullable()->constrained('users')->nullOnDelete();
            $table->json('proposed');                      // only the fields that change: { name: "...", courses: [...] }
            $table->text('reason');                        // why, shown to the admin
            $table->string('status')->default('Pending');  // Pending | Approved | Rejected
            $table->text('review_note')->nullable();       // the admin's note when rejecting
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('org_change_requests');
    }
};
