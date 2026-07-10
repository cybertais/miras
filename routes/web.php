<?php

use Illuminate\Support\Facades\Route;
// This catch-all route ensures React Router handles all frontend URLs
Route::get('/{any}', function () {
    return view('welcome');
})->where('any', '.*');