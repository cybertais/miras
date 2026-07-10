<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;

class LocationController extends Controller
{
    public function provinces()
    {
        $provinces = DB::table('province')->select('provinceId', 'pro_name')->orderBy('pro_name')->get();
        return response()->json($provinces);
    }

    public function llgs()
    {
        $llgs = DB::table('llg')->select('llgIdPk', 'llgName')->orderBy('llgName')->get();
        return response()->json($llgs);
    }

    public function wards($llgId)
    {
        $wards = DB::table('ward')
            ->where('llgIdFk', $llgId)
            ->select('wardIdPk', 'wardName')
            ->orderBy('wardName')
            ->get();
            
        return response()->json($wards);
    }
}