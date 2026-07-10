<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Services\AuditLogger; // Import the Audit Logger

class StudentController extends Controller
{

// Soft Delete a student
    public function destroy($id)
    {
        $person = DB::table('persons')->where('personIdPk', $id)->first();

        if (!$person) {
            return response()->json(['success' => false, 'message' => 'Applicant not found.'], 404);
        }

        // Soft Delete in 'persons'
        DB::table('persons')->where('personIdPk', $id)->update([
            'ispersonRecDeleted' => 1,
            'deletedate' => now(), 
            'modStamp' => now()
        ]);

        // Soft Delete in 'student'
        DB::table('student')->where('personidfk', $id)->update([
            'is_delete' => 1
        ]);

        // ENFORCE AUDIT TRAIL LOGGING
        $fullName = trim($person->givenName . ' ' . $person->surName);
        
        // This line right here writes securely to your system_auditlog table
        AuditLogger::log('persons', 'DELETE', $id, "Soft deleted applicant: {$fullName}");

        return response()->json(['success' => true, 'message' => 'Applicant deleted successfully.']);
    }

    public function index(Request $request)
    {
        $perPage = $request->input('per_page', 10);
        $search = $request->input('search', '');
        
        // 1. Get sorting parameters (Defaulting to your SQL's 'personIdPk DESC')
        $sortColumn = $request->input('sort', 'persons.personIdPk');
        $sortDirection = $request->input('direction', 'desc');

        // 2. Validate allowed sort columns
        $allowedSorts = [
            'persons.personIdPk',
            'fullnameStudent', 
            'persons.gender', 
            'provinceName', 
            'current_resident' 
        ];
        
        if (!in_array($sortColumn, $allowedSorts)) {
            $sortColumn = 'persons.personIdPk';
            $sortDirection = 'desc';
        }

        // 3. Build the query using your exact SQL fields
        $query = DB::table('persons')
            // Removed the join to the student table as requested
            ->leftJoin('ward', 'persons.wardidfk', '=', 'ward.wardIdPk')
            ->leftJoin('llg', 'ward.llgIdFk', '=', 'llg.llgIdPk')
            ->leftJoin('province', 'persons.provinceidfk', '=', 'province.provinceId')
            ->select(
                // Person Fields
                'persons.dob',
                'persons.deletedate',
                'persons.modStamp',
                'persons.createdStamp',
                'persons.personIdPk',
                'persons.districtOfOriginIdFk',
                'persons.provinceidfk',
                'persons.wardidfk',
                'persons.ispersonRecDeleted',
                'persons.status',
                'persons.surName',
                'persons.middleName',
                'persons.givenName',
                'persons.gender',
                'persons.maritalStatus',
                'persons.phone1',
                'persons.phone2',
                'persons.email',
                'persons.postalAddress',
                'persons.fileNumber',
                'persons.personimage',
                'persons.deletecomment',
                'persons.stdstatus',
                'persons.lastschoolattended',
                'persons.secondaryresidentaladdressintown as current_resident', // Aliased for React
                'persons.givenName_dependent',
                'persons.surName_dependent',
                'persons.gender_dependent',
                'persons.addrelationshiptostudent',
                'persons.email_dependent',
                'persons.phone1_dependent',
                'persons.phone2_dependent',
                'persons.guardianresidentaladdress',
                
                // Concatenated Fields (Using DB::raw)
                DB::raw('CONCAT_WS(" ", persons.givenName, persons.middleName, persons.surName) AS fullnameStudent'),
                DB::raw('CONCAT_WS(" ", persons.givenName_dependent, UPPER(persons.surName_dependent)) AS fullnameDependent'),
                
                // Province Fields
                'province.provinceId',
                'province.regionid',
                'province.pro_name as provinceName', // Aliased for React
                'province.provcode',
                
                // LLG Fields
                'llg.llgIdPk',
                'llg.districtIdFk',
                'llg.llgDateCreated',
                'llg.llgCode',
                'llg.llgName',
                
                // Ward Fields
                'ward.wardIdPk',
                'ward.llgIdFk as ward_llgIdFk', // Aliased to prevent collision
                'ward.wardDateCreated',
                'ward.wardDateModified',
                'ward.wardCode',
                'ward.wardName'
            )
            ->where('persons.ispersonRecDeleted', false); // Your requested WHERE clause

        // 4. Apply search
        if (!empty($search)) {
            $query->where(function($q) use ($search) {
                // Search against the concatenated full name
                $q->where(DB::raw('CONCAT_WS(" ", persons.givenName, persons.middleName, persons.surName)'), 'like', "%{$search}%")
                  ->orWhere('persons.email', 'like', "%{$search}%");
            });
        }

        // 5. Apply ordering and paginate
        $students = $query->orderBy($sortColumn, $sortDirection)->paginate($perPage);

        return response()->json($students);
    }

    public function store(Request $request)
    {
        // 1. Validate the incoming request with Custom Friendly Messages
        $request->validate([
            'givenName' => 'required|string|max:255',
            'surname' => 'required|string|max:255',
            'gender' => 'required|string',
            'dob' => 'required|date',
            'phone1' => 'required|string|max:50',
            'email' => 'required|email|max:255',
            'lastSchool' => 'required|string|max:255',
            'postalAddress' => 'required|string|max:255',
            'depGivenName' => 'required|string|max:255',
            'depSurname' => 'required|string|max:255',
            'depGender' => 'required|string',
            'depRelation' => 'required|string|max:255',
            'depEmail' => 'required|email|max:255',
            'depPhone1' => 'required|string|max:50',
            'depAddress' => 'required|string|max:255',
        ], [
            // Custom error messages exactly matching your UI requirements
            'givenName.required' => 'Given Name is required.',
            'surname.required' => 'Surname is required.',
            'gender.required' => 'Gender is required.',
            'dob.required' => 'Date of Birth is required.',
            'phone1.required' => 'Phone 1 is required.',
            'email.required' => 'Email Address is required.',
            'lastSchool.required' => 'Last School Attended is required.',
            'postalAddress.required' => 'Postal Address is required.',
            'depGivenName.required' => 'Guardian Given Name is required.',
            'depSurname.required' => 'Guardian Surname is required.',
            'depGender.required' => 'Guardian Gender is required.',
            'depRelation.required' => 'Relationship to Student is required.',
            'depEmail.required' => 'Guardian Email is required.',
            'depPhone1.required' => 'Guardian Phone 1 is required.',
            'depAddress.required' => 'Guardian Address is required.',
            'email.email' => 'Please provide a valid Email Address.',
            'depEmail.email' => 'Please provide a valid Guardian Email.',
        ]);

        // 2. Handle the Image Upload
        $imageName = null;
        if ($request->hasFile('photo')) {
            $file = $request->file('photo');
            $imageName = 'std_' . time() . '.' . $file->getClientOriginalExtension();
            $file->storeAs('student_images', $imageName, 'public'); 
        }

        // 3. Determine Location Logic based on "Other Province" checkbox
        $isOtherProvince = $request->input('isOtherProvince') === 'true';
        $provinceId = $isOtherProvince ? $request->input('province') : null;
        $wardId = $isOtherProvince ? null : $request->input('ward');

        // 4. Insert into the `persons` table
        $personId = DB::table('persons')->insertGetId([
            'givenName' => $request->input('givenName'),
            'middleName' => $request->input('middleName'),
            'surName' => $request->input('surname'),
            'gender' => $request->input('gender'),
            'dob' => $request->input('dob'),
            'phone1' => $request->input('phone1'),
            'phone2' => $request->input('phone2'),
            'email' => $request->input('email'),
            'lastschoolattended' => $request->input('lastSchool'),
            'postalAddress' => $request->input('postalAddress'),
            'secondaryresidentaladdressintown' => $request->input('secondaryAddress'),
            'provinceidfk' => $provinceId ?: null,
            'wardidfk' => $wardId ?: null,
            'givenName_dependent' => $request->input('depGivenName'),
            'surName_dependent' => $request->input('depSurname'),
            'gender_dependent' => $request->input('depGender'),
            'addrelationshiptostudent' => $request->input('depRelation'),
            'email_dependent' => $request->input('depEmail'),
            'phone1_dependent' => $request->input('depPhone1'),
            'phone2_dependent' => $request->input('depPhone2'),
            'guardianresidentaladdress' => $request->input('depAddress'),
            'personimage' => $imageName,
            'createdStamp' => now(),
            'ispersonRecDeleted' => 0,
        ]);

        // 5. Insert into the `student` table to link the person as an active applicant
        $studentId = DB::table('student')->insertGetId([
            'personidfk' => $personId,
            'year_register' => date('Y'),
            'studentIsActive' => 0,
            'is_delete' => 0,
            'student_datecreated' => now(),
        ]);

        // 6. ENFORCE AUDIT TRAIL FOR INSERTS
        $fullName = trim($request->input('givenName') . ' ' . $request->input('surname'));
        AuditLogger::log('persons', 'INSERT', $personId, "Created personal record for {$fullName}");
        AuditLogger::log('student', 'INSERT', $studentId, "Registered {$fullName} as a new applicant");

        return response()->json([
            'success' => true, 
            'message' => 'Applicant registered successfully!'
        ]);
    }



public function show($id)
    {
        // Find the absolute latest allocation that isn't deleted
        $latestStudentId = DB::table('student')
            ->where('personidfk', $id)
            ->where('is_delete', 0)
            ->max('studentidpk');

        $person = DB::table('persons')
            ->leftJoin('ward', 'persons.wardidfk', '=', 'ward.wardIdPk')
            ->leftJoin('llg', 'ward.llgIdFk', '=', 'llg.llgIdPk')
            ->leftJoin('province', 'persons.provinceidfk', '=', 'province.provinceId')
            // Join ONLY the latest allocation to the main card
            ->leftJoin('student', function ($join) use ($latestStudentId) {
                $join->on('persons.personIdPk', '=', 'student.personidfk')
                     ->where('student.studentidpk', '=', $latestStudentId);
            })
            ->leftJoin('course', 'student.courseidfk', '=', 'course.courseidpk')
            ->leftJoin('organization', 'course.instutionsidfk', '=', 'organization.organizationIdPk')
            ->select(
                'persons.*',
                'ward.wardName',
                'llg.llgName',
                'province.pro_name as provinceName',
                'student.studentnumber',
                'student.studentIsActive',
                'student.courseidfk as course_id',
                'course.instutionsidfk as institution_id',
                'course.coursename',
                'course.coursecode',
                'course.studyduration',
                'organization.organizationName',
                'organization.organizationCode',
                'organization.organizationLocation',
                'organization.organizationLL',
                'organization.organizationPh',
                'organization.organizationEmail'
            )
            ->where('persons.personIdPk', $id)
            ->first();

        if (!$person) {
            return response()->json(['success' => false, 'message' => 'Student not found'], 404);
        }

        // Fetch History (Everything EXCEPT the latest allocation)
        $history = DB::table('student')
            ->leftJoin('course', 'student.courseidfk', '=', 'course.courseidpk')
            ->leftJoin('organization', 'course.instutionsidfk', '=', 'organization.organizationIdPk')
            ->select(
                'student.studentnumber',
                'student.year_register',
                'course.coursename',
                'course.studyduration',
                'organization.organizationName'
            )
            ->where('student.personidfk', $id)
            ->where('student.is_delete', 0)
            ->when($latestStudentId, function($query) use ($latestStudentId) {
                return $query->where('student.studentidpk', '!=', $latestStudentId);
            })
            ->orderBy('student.year_register', 'desc')
            ->get();

        $person->history = $history;

        return response()->json($person);
    }



    // Update the student's details
    public function update(Request $request, $id)
    {
        $request->validate([
            'givenName' => 'required|string|max:255',
            'surname' => 'required|string|max:255',
            'gender' => 'required|string',
            'dob' => 'required|date',
            'phone1' => 'required|string|max:50',
            'email' => 'required|email|max:255',
            'lastSchool' => 'required|string|max:255',
            'postalAddress' => 'required|string|max:255',
            'depGivenName' => 'required|string|max:255',
            'depSurname' => 'required|string|max:255',
            'depGender' => 'required|string',
            'depRelation' => 'required|string|max:255',
            'depEmail' => 'required|email|max:255',
            'depPhone1' => 'required|string|max:50',
            'depAddress' => 'required|string|max:255',
        ], [
            // Custom friendly messages matching the Register module
            'givenName.required' => 'Given Name is required.',
            'surname.required' => 'Surname is required.',
            'gender.required' => 'Gender is required.',
            'dob.required' => 'Date of Birth is required.',
            'phone1.required' => 'Phone 1 is required.',
            'email.required' => 'Email Address is required.',
            'lastSchool.required' => 'Last School Attended is required.',
            'postalAddress.required' => 'Postal Address is required.',
            'depGivenName.required' => 'Guardian Given Name is required.',
            'depSurname.required' => 'Guardian Surname is required.',
            'depGender.required' => 'Guardian Gender is required.',
            'depRelation.required' => 'Relationship to Student is required.',
            'depEmail.required' => 'Guardian Email is required.',
            'depPhone1.required' => 'Guardian Phone 1 is required.',
            'depAddress.required' => 'Guardian Address is required.',
            'email.email' => 'Please provide a valid Email Address.',
            'depEmail.email' => 'Please provide a valid Guardian Email.',
        ]);

        $isOtherProvince = $request->input('isOtherProvince') === 'true' || $request->input('isOtherProvince') === '1';
        $provinceId = $isOtherProvince ? $request->input('province') : null;
        $wardId = $isOtherProvince ? null : $request->input('ward');

        $updateData = [
            'givenName' => $request->input('givenName'),
            'middleName' => $request->input('middleName'),
            'surName' => $request->input('surname'),
            'gender' => $request->input('gender'),
            'dob' => $request->input('dob'),
            'phone1' => $request->input('phone1'),
            'phone2' => $request->input('phone2'),
            'email' => $request->input('email'),
            'lastschoolattended' => $request->input('lastSchool'),
            'postalAddress' => $request->input('postalAddress'),
            'secondaryresidentaladdressintown' => $request->input('secondaryAddress'),
            'provinceidfk' => $provinceId,
            'wardidfk' => $wardId,
            'givenName_dependent' => $request->input('depGivenName'),
            'surName_dependent' => $request->input('depSurname'),
            'gender_dependent' => $request->input('depGender'),
            'addrelationshiptostudent' => $request->input('depRelation'),
            'email_dependent' => $request->input('depEmail'),
            'phone1_dependent' => $request->input('depPhone1'),
            'phone2_dependent' => $request->input('depPhone2'),
            'guardianresidentaladdress' => $request->input('depAddress'),
            'modStamp' => now(),
        ];

        // Handle Image Upload if a new one is provided
        if ($request->hasFile('photo')) {
            $file = $request->file('photo');
            $imageName = 'std_' . time() . '.' . $file->getClientOriginalExtension();
            $file->storeAs('student_images', $imageName, 'public');
            $updateData['personimage'] = $imageName;
        }

        DB::table('persons')->where('personIdPk', $id)->update($updateData);

        // ENFORCE AUDIT TRAIL FOR UPDATES
        $fullName = trim($request->input('givenName') . ' ' . $request->input('surname'));
        AuditLogger::log('persons', 'UPDATE', $id, "Updated details/location for {$fullName}");

        return response()->json([
            'success' => true, 
            'message' => 'Applicant updated successfully!'
        ]);
    }
}