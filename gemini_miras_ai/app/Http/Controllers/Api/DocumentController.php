<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class DocumentController extends Controller
{
    /**
     * Handle document upload with specific directory and naming structure.
     */
    public function uploadDocument(Request $request)
    {
        // 1. Validate the file exists and matches your allowed types
        $request->validate([
            'document' => [
                'required',
                'file',
                // Max size in kilobytes (e.g., 10240 = 10MB)
                'max:10240', 
                // Allowed extensions: jpg, png, pdf, word, excel, powerpoint, txt, gif
                'mimes:jpg,jpeg,png,gif,pdf,doc,docx,xls,xlsx,ppt,pptx,txt'
            ]
        ]);

        $file = $request->file('document');

        // 2. Generate the date-based components
        $yy = date('y');       // e.g., '26'
        $mmyy = date('my');    // e.g., '0626'
        $timestamp = time();   // e.g., 1780488000

        // 3. Clean the original file name (optional but recommended to remove spaces)
        $originalName = $file->getClientOriginalName();
        $cleanOriginalName = preg_replace('/[^A-Za-z0-9.\-_]/', '_', $originalName);

        // 4. Construct the Folder Path and File Name
        // Structure: yy/mmyy
        $folderPath = "{$yy}/{$mmyy}"; 
        
        // Structure: mmyy_timestamp_original_file_name
        $fileName = "{$mmyy}_{$timestamp}_{$cleanOriginalName}";

        // 5. Store the file in the 'public' disk (storage/app/public)
        // storeAs() automatically creates the folders if they don't exist
        $filePath = $file->storeAs($folderPath, $fileName, 'public');

        // Return the path so you can save it to your database
        return response()->json([
            'success' => true,
            'message' => 'Document uploaded successfully.',
            'file_path' => $filePath, // Example: 26/0626/0626_1780488000_document.pdf
            'file_url'  => Storage::url($filePath) // Generates the public accessible URL
        ]);
    }
}