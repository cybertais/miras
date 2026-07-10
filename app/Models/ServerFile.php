<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ServerFile extends Model
{
    use HasFactory;

    // Explicitly define the table name
    protected $table = 'server_files';
    
    // Explicitly define the primary key since we changed it from 'id' to 'file_id'
    protected $primaryKey = 'file_id';

    // Allow all fields to be mass-assignable (Guarded is empty)
    protected $guarded = [];
    
    /**
     * Helper to get file size in a readable format (KB, MB, etc.)
     */
    public function getReadableSizeAttribute()
    {
        $bytes = $this->size_bytes;
        if ($bytes === null) return 'Unknown';
        
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);
        $bytes /= (1 << (10 * $pow));

        return round($bytes, 2) . ' ' . $units[$pow];
    }
}