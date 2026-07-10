<?php

namespace App\Http\Controllers\Api;

use Illuminate\Support\Facades\DB;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use App\Models\User;
use Illuminate\Validation\ValidationException;
use App\Services\AuditLogger;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    /**
     * Handle Actual Password Reset with Token (API Optimized)
     */
    public function resetPassword(Request $request)
    {
        // 1. Validate the incoming React payload
        $request->validate([
            'token' => 'required',
            'email' => 'required|email',
            'password' => 'required|min:8|confirmed',
        ]);

        // 2. Use Laravel's built-in broker to handle verification, expiration, and resetting securely
        $status = Password::broker()->reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($user, $password) {
                // Update the User's Password with a secure Bcrypt hash
                $user->password = Hash::make($password);
                $user->save();

                // Fire Laravel's native reset event
                event(new PasswordReset($user));
            }
        );

        // 3. Check the status of the reset
        if ($status === Password::PASSWORD_RESET) {
            // Find user to log the action
            $user = User::where('email', $request->email)->first();
            
            // Securely log the success in the Audit Trail
            AuditLogger::log('users', 'PASSWORD_RESET_SUCCESS', $user->getKey(), "Password reset successfully for {$user->email}.");

            return response()->json(['success' => true, 'message' => 'Password successfully reset. You can now login!']);
        }

        // 4. If it fails (e.g., expired/invalid token), return the translated error string
        return response()->json(['success' => false, 'message' => __($status)], 400);
    }

    /**
     * Handle Login Request with Automatic Legacy Hash Upgrading
     */
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required'
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials do not match our records.']
            ]);
        }

        // 1. Check Standard Laravel Bcrypt Hash
        if (Hash::check($request->password, $user->password)) {
            
            // Generate Sanctum Token
            $token = $user->createToken('miras_auth_token')->plainTextToken;
            
            // Load relationships to send back to React
            $user->load('roles.permissions');
            
            // Format the user array to include flat arrays of roles and permissions
            $userData = array_merge($user->toArray(), [
                'roles' => $user->roles->pluck('name'),
                'permissions' => $user->roles->flatMap->permissions->pluck('name')->unique()->values()->all(),
            ]);

            AuditLogger::log('users', 'LOGIN', $user->getKey(), "User {$user->email} logged in successfully.");
            
            return response()->json([
                'success' => true, 
                'token' => $token, 
                'user' => $userData // Send the formatted user data
            ]);
        }
        
        // 2. Check Legacy SHA-256 Hash (Migration Fallback)
        elseif ($user->password === hash('sha256', $request->password)) {
            // Upgrade the user's password to secure Bcrypt invisibly
            $user->password = Hash::make($request->password);
            $user->save();
            
            // Generate Sanctum Token
            $token = $user->createToken('miras_auth_token')->plainTextToken;
            
            // Load relationships to send back to React
            $user->load('roles.permissions');
            
            // Format the user array to include flat arrays of roles and permissions
            $userData = array_merge($user->toArray(), [
                'roles' => $user->roles->pluck('name'),
                'permissions' => $user->roles->flatMap->permissions->pluck('name')->unique()->values()->all(),
            ]);

            AuditLogger::log('users', 'SECURITY_UPGRADE', $user->getKey(), "Legacy SHA-256 password upgraded to Bcrypt for {$user->email}.");
            
            return response()->json([
                'success' => true, 
                'token' => $token, 
                'user' => $userData, // Send the formatted user data
                'message' => 'Security profile upgraded successfully.'
            ]);
        }

        // 3. Fail if neither matches
        AuditLogger::log('users', 'LOGIN_FAILED', $user->getKey() ?? 0, "Failed login attempt for email: {$request->email}");
        throw ValidationException::withMessages([
            'email' => ['The provided credentials do not match our records.']
        ]);
    }

    /**
     * Handle Logout Request
     */
    public function logout(Request $request)
    {
        // Revoke the current user's access token
        $request->user()->currentAccessToken()->delete();
        
        AuditLogger::log('users', 'LOGOUT', $request->user()->getKey(), "User logged out.");
        return response()->json(['success' => true, 'message' => 'Logged out successfully.']);
    }

    /**
     * Handle Forgot Password Link Request
     */
    public function forgotPassword(Request $request)
    {
        $request->validate(['email' => 'required|email']);

        // Utilize Laravel's built-in Password Broker to send the reset link
        $status = Password::broker()->sendResetLink(
            $request->only('email')
        );

        if ($status === Password::RESET_LINK_SENT) {
            AuditLogger::log('users', 'PASSWORD_RESET', 0, "Password reset link requested for {$request->email}");
            return response()->json(['success' => true, 'message' => 'Password reset link sent to your email.']);
        }

        return response()->json(['success' => false, 'message' => __($status)], 400);
    }
}