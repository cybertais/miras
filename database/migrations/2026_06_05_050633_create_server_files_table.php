<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('server_files', function (Blueprint $table) {
            $table->id('file_id');
            
            // File Details
            $table->string('filename')->comment('The generated unique filename');
            $table->string('original_name')->nullable()->comment('The original name of the file before upload');
            $table->string('file_path')->comment('The relative path on the specified disk');
            $table->string('disk')->default('local')->comment('The filesystem disk (e.g., local, public, s3)');
            
            // File Metadata
            $table->string('mime_type')->nullable()->comment('e.g., application/pdf, image/png');
            $table->unsignedBigInteger('size_bytes')->nullable()->comment('File size in bytes');
            
            // Context & Tracking
            $table->string('file_category')->nullable()->comment('e.g., backup, student_document, avatar');
            $table->unsignedBigInteger('uploaded_by')->nullable()->comment('References userprofile.userIdPk');
            
            // Timestamps
            $table->timestamps(); // Creates created_at and updated_at columns
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('server_files');
    }
};