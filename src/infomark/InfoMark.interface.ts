//-----------------------------------------------------------------------------
// CUSTOM INTERFACES
//-----------------------------------------------------------------------------

/**
* For error states.
*/
export interface Status {
    readonly status: string;
    readonly error?: string;
}

export interface Error {
    readonly code: string;
    readonly message: string;
}

export interface PrivacyStatement {
    readonly text: string;
}

export interface Zip {
    
}

export type Bid = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

//-----------------------------------------------------------------------------
// INTERFACES SPECIFICED BY INFOMARK
// https://infomark.org/swagger/
//-----------------------------------------------------------------------------
interface InfomarkResponse {}

export interface JWTRequest {
    // empty on purpose
}

export interface UserRequest {
    readonly first_name: string;
    readonly last_name: string;
    readonly email: string;
    readonly student_number: string;
    readonly semester: number;
    readonly subject: string;
    readonly language: string;
    readonly plain_password: string;
}

export interface UserMeRequest extends InfomarkResponse {
    readonly first_name: string;
    readonly last_name: string;
    readonly student_number: string;
    readonly semester: number; // minimum: 1
    readonly subject: string;
    readonly language: string; // length: 2
}

export interface GradeRequest extends InfomarkResponse {
    readonly acquired_points: number;
    readonly feedback: string;
}

export interface CourseRequest extends InfomarkResponse {
    readonly name: string;
    readonly description: string;
    readonly begins_at: string; // ($date-time)
    readonly ends_at: string; //($date-time)
    readonly required_percentage: number;
}

export interface ChangeRoleInCourseRequest extends InfomarkResponse {
    readonly role: number;
}

export interface ExamRequest extends InfomarkResponse {
    readonly name: string;
    readonly description: string;
    readonly exam_time: string; //($date-time)
}

export interface UserExamRequest extends InfomarkResponse {
    readonly status: number;
    readonly mark: string;
    readonly user_id: number; //($int64)
}

export interface EmailRequest extends InfomarkResponse {
    readonly subject: string;
    readonly body: string;
}

export interface LoginRequest extends InfomarkResponse {
    readonly email: string; //($email)
    readonly plain_password: string; // ($password)
}

export interface ResetPasswordRequest extends InfomarkResponse {
    readonly email: string; //($email)
}

export interface UpdatePasswordRequest extends InfomarkResponse {
    readonly email: string; // ($email)
    readonly reset_password_token: string; // ($password)
    readonly plain_password: string; // ($password)
}

export interface ConfirmEmailRequest extends InfomarkResponse {
    readonly email: string; // ($email)
    readonly confirmation_token: string;
}

export interface MaterialRequest extends InfomarkResponse {
    readonly name: string;
    readonly kind: number;
    readonly publish_at: string; // ($date-time)
    readonly lecture_at: string; // ($date-time)
    readonly required_role: number;
}

export interface TaskRequest extends InfomarkResponse {
    readonly max_points: number;
    readonly name: string;
    readonly public_docker_image: string;
    readonly private_docker_image: string;
}

export interface TaskRatingRequest extends InfomarkResponse {
    readonly rating: number;
}

export interface SheetRequest extends InfomarkResponse {
    readonly name: string;
    readonly publish_at: string; // ($date-time)
    readonly due_at: string; // ($date-time)
}


export interface GroupRequest extends InfomarkResponse {
    readonly tutor: { id: number; } // ($int64)
    readonly description: string;
}


export interface GroupBidRequest extends InfomarkResponse {
    readonly bid: Bid; // minimum: 0 //maximum: 10
}


export interface GroupEnrollmentRequest extends InfomarkResponse {
    readonly user_id: number; // ($int64)
}

export interface CreateUserAccountRequest extends InfomarkResponse {
    readonly user:    {
        first_name: string;
        last_name: string;
        email: string; // ($email)
        student_number: string;
        semester: number; //minimum: 1
        subject: string;
        language: string; // length: 2
    }
    readonly account: LoginRequest
}

export interface AccountRequest extends InfomarkResponse {
    readonly account: LoginRequest;
    readonly old_plain_password: string; // ($password)
}


export interface TaskRatingResponse extends InfomarkResponse {
    readonly task_id: number; // ($int64)
    readonly average_rating: number; // ($float32)
    readonly own_rating: number;
}

export interface GroupResponse extends InfomarkResponse {
    readonly id: number; // ($int64)
    readonly course_id: number; // ($int64)
    readonly description: string;
    readonly tutor: {
        id: number; // ($int64)
        first_name: string;
        last_name: string;
        avatar_url: string;
        email: string; // ($email)
        language: string; // length: 2
        student_number: string;
        semester: number; //minimum: 1
        subject: string;
        root: boolean;
    }
}

export interface GroupBidResponse extends InfomarkResponse {
    readonly bid: Bid; // minimum: 0, maximum: 10
}

export interface TaskResponse extends InfomarkResponse {
    readonly id: number; // ($int64)
    readonly name: string;
    readonly max_points: number;
    readonly public_docker_image: string;
    readonly private_docker_image: string;
}

export interface MissingTaskResponse extends InfomarkResponse {
    readonly task: TaskResponse
    readonly course_id: number; // ($int64)
    readonly sheet_id: number; // ($int64)
}

export interface ExamResponse extends InfomarkResponse {
    readonly id: number; // ($int64)
    readonly name: string;
    readonly description: string;
    readonly exam_time: string; // ($date-time)
    readonly course_id: number; // ($int64)
}

export interface ExamEnrollmentResponse extends InfomarkResponse {
    readonly status: number;
    readonly mark: string;
    readonly user_id: number; // ($int64)
    readonly course_id: number; // ($int64)
    readonly exam_id: number; // ($int64)
}

export interface AuthResponse extends InfomarkResponse {
    readonly access: { token: string };
    readonly refresh: { token: string };
}

export interface LoginResponse extends InfomarkResponse {
    readonly root: boolean;
}

export interface SubmissionResponse extends InfomarkResponse {
    readonly id: number; // ($int64)
    readonly user_id: number; // ($int64)
    readonly task_id: number; // ($int64)
    readonly file_url: string;
}

export interface UserShort {
    readonly id: number; // ($int64)
    readonly first_name: string;
    readonly last_name: string;
    readonly email: string; // ($email)
}


export interface GradeResponse extends InfomarkResponse {
    readonly id: number; // ($int64)
    readonly public_execution_state: number;
    readonly private_execution_state: number;
    readonly public_test_log: string;
    readonly private_test_log: string;
    readonly public_test_status: number;
    readonly private_test_status: number;
    readonly acquired_points: number;
    readonly feedback: string;
    readonly tutor_id: number; // ($int64)
    readonly submission_id: number; // ($int64)
    readonly file_url: string;
    readonly user: UserShort
}

export interface MissingGradeResponse extends InfomarkResponse {
    readonly grade:    {
        id: number; // ($int64)
        public_execution_state: number;
        private_execution_state: number;
        public_test_log: string;
        private_test_log: string;
        public_test_status: number;
        private_test_status: number;
        acquired_points: number;
        feedback: string;
        tutor_id: number; // ($int64)
        submission_id: number; // ($int64)
        file_url: string;
        user: UserShort;
    }
    readonly course_id: number; // ($int64)
    readonly sheet_id: number; // ($int64)
    readonly task_id: number; // ($int64)
}

export interface MaterialResponse extends InfomarkResponse {
    readonly id: number; // ($int64)
    readonly name: string;
    readonly file_url: string;
    readonly kind: number;
    readonly publish_at: string; // ($date-time)
    readonly lecture_at: string; // ($date-time)
    readonly required_role: number;
}

export interface UserResponse extends InfomarkResponse {
    readonly id: number; // ($int64)
    readonly first_name: string;
    readonly last_name: string;
    readonly avatar_url: string;
    readonly email: string; // ($email)
    readonly student_number: string;
    readonly semester: number; // minimum: 1
    readonly subject: string;
    readonly language: string; //length: 2
    readonly root: boolean;
}

export interface RawResponse extends InfomarkResponse {
    readonly text: string;
}

export interface VersionResponse extends InfomarkResponse {
    readonly commit: string;
    readonly version: string;
}

export interface CourseResponse extends InfomarkResponse {
    readonly id: number; // ($int64)
    readonly name: string;
    readonly description: string;
    readonly begins_at: string; // ($date-time)
    readonly ends_at: string; // ($date-time)
    readonly required_percentage: number;
}

export interface SheetPointsResponse extends InfomarkResponse {
    readonly acquired_points: number;
    readonly max_points: number;
    readonly sheet_id: number;
}

export interface GroupBidsResponse extends InfomarkResponse {
    readonly id: number; // ($int64)
    readonly user_id: number; // ($int64)
    readonly group_id: number; // ($int64)
    readonly bid: Bid; // minimum: 0, maximum: 10
}

export interface EnrollmentResponse extends InfomarkResponse {
    readonly role: number; // ($int64)
    readonly user:    {
        id: number; // ($int64)
        first_name: string;
        last_name: string;
        avatar_url: string;
        email: string; // ($email)
        student_number: string;
        semester: number; //minimum: 1
        subject: string;
        language: string; //length: 2
    }
}

export interface SheetResponse extends InfomarkResponse {
    readonly id: number; // ($int64)
    readonly name: string;
    readonly file_url: string;
    readonly publish_at: string; // ($date-time)
    readonly due_at: string; // ($date-time)
}

export interface TaskPointsResponse extends InfomarkResponse {
    readonly acquired_points: number;
    readonly max_points: number;
    readonly task_id: number;
}

// This format is specified in 
// https://infomark.org/swagger/#/tasks/get_courses__course_id__sheets__sheet_id__tasks
// and doesn't match any specified response schema.
export interface TaskPointsResponse2 extends InfomarkResponse {
    readonly id: number,
    readonly name: string,
    readonly max_points: number
}

export interface UserEnrollmentResponse extends InfomarkResponse {
    readonly id: number; // ($int64)
    readonly course_id: number; // ($int64)
    readonly role: number; // ($int64)
}
