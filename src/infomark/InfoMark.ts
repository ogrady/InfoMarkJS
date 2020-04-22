import * as https from "https";
import * as http from "http";
import * as lo from "lodash";
import * as fs from "fs";
import * as imi from "./InfoMark.interface";
import * as moment from "moment";

/**
* InfoMark request options
*/
interface RequestOptions {
    readonly route: string[],
    readonly getOptions?: Object,
    readonly apiVersion?: "v1"    
}

interface HTTPX {
    request(options: any, callback: any): any;
}

//-----------------------------------------------------------------------------
// CLASSES
//-----------------------------------------------------------------------------

/**
* Base class for either HTTP or HTTPS requests.
*/
export class Agent {
    private buildHeaders(args: {token?: string, contentType?: string, contentLength?: number})
    : {[key: string]: string} {
        const headers: {[key: string]: string} = {};
        if(args.contentType !== undefined) {
            headers["Content-Type"] = args.contentType;
        }
        if(args.contentLength !== undefined) {
            headers["Content-Length"] = ""+args.contentLength;
        }
        if(args.token !== undefined) {
            headers["Authorization"] = `Bearer ${args.token}`;
        }
        return headers;
    }

    public get(route: string, token: string | undefined = undefined)
    : Promise<string> {
        return this.request({ 
            path: route
            , method: "GET"
            , headers: this.buildHeaders({
              token: token  
            })
        });
    }
    
    public post(route: string, payload: any, token: string | undefined = undefined)
    : Promise<string> {
        const strpl: string = JSON.stringify(payload);
        return this.request({
            path: route
            , method: "POST"
            , headers: this.buildHeaders({
                contentType: "application/json", 
                contentLength: Buffer.byteLength(strpl),
                token: token
            })
        }, strpl);
    }
    //public abstract put(url: string, options: Object): Promise<string>;
    
    public delete(route: string, token: string)
    : Promise<string> {
        return this.request({
            path: route
            , method: "DELETE"
            , headers: this.buildHeaders({
                contentType: "application/json",
                token: token
            })
        });
    }

    private host: string;
    private port: number;
    private httpx: HTTPX;

    public constructor(host: string, port: number, httpx: HTTPX) {
        this.host = host;
        this.port = port;
        this.httpx = httpx;
    }

    /**
    * Sends a request using https://nodejs.org/api/http.html#http_http_request_options_callback (or https, respectively).
    * Some of the standard HTTP headers can be passed (see typedef). For some of them a default is given. 
    * All default values can be overwritten, as parameters are deep-merged. 
    *
    * @param httpOptions HTTP headers
    * @param data optional POST payload
    * @returns promise of fulfilled request as string. 
    */
    private request(httpOptions: {path: string, headers?: object, method?: "GET" | "POST" | "PUT" | "DELETE"}, data: any = undefined)
    : Promise<string> {
        const options = lo.merge({
            hostname: this.host,
            port: this.port,
            headers: { "user-agent": "node.js", "accept": "*/*" },
            method: "GET"
        }, httpOptions);
        // console.log(options, data);

        return new Promise<string>((resolve, reject) => {
            const req = this.httpx.request(options, (response: any) => {
                  let body = "";
                  response.on("data", (chunk: any) => body += ""+chunk);
                  response.on("end", () => resolve(body));
                }).on("error", reject);
            if(data !== undefined) {
                req.write(data);
            }
            req.end();
        });
    }
}

/**
* Any InfoMark endpoint.
*/
class Endpoint {
    protected readonly infomark: InfoMark;

    public constructor(infomark: InfoMark) {
        this.infomark = infomark;
    }

    /**
    * Puts together a URL. 
    * @deprecated URLs are not used anymore, instead, requests are sent by host + port + route.
    * @param route final tokens of the URL, will be concatenated using slashes. 
    * @param version API version. At the time of writing, only v1 is available. 
    * @returns a concatenated URL to send the request to, based on the protocol and host information
    *          retrieved from the InfoMark client and the route. 
    */
    protected url(route: string[], version: string = "v1")
    : string {
        return `${this.infomark.protocol}://${this.infomark.host}:${this.infomark.port}/api/${version}/${route.join("/")}`;
    }

    /**
    * Puts together a route relative to the known base host. 
    * @param route parts of the route that are concatenated. 
    * @param version API version.
    */
    protected route(route: string[], version: string = "v1")
    : string {
        return `/api/${version}/${route.join("/")}`
    }
}

/**
* Common endpoint.
*/
class Common extends Endpoint {
    public constructor(infomark: InfoMark) {
        super(infomark);
    }

    /**
    * https://infomark.org/swagger/#/common/get_ping
    */
    public ping()
    : Promise<string> {
        return this.infomark.agent.get(this.route(["ping"]));
    }

    /**
    * https://infomark.org/swagger/#/common/get_version
    */
    public async version()
    : Promise<imi.VersionResponse> {
        return JSON.parse(await this.infomark.agent.get(this.route(["version"])));
    }

    /**
    * https://infomark.org/swagger/#/common/get_privacy_statement
    */
    public async privacyStatement()
    : Promise<imi.PrivacyStatement> {
        return JSON.parse(await this.infomark.agent.get(this.route(["privacy_statement"])));
    }
}

class Auth extends Endpoint {
    public constructor(infomark: InfoMark) {
        super(infomark);
    }

    public sessions(): {post: Function, delete: Function} {
      const that = this; // I don't know man. fn.bind(this) behaves weird in Typescript...
      return {
            // https://infomark.org/swagger/#/auth/post_auth_sessions
            post: async function(email: string, password: string)
                : Promise<imi.AuthResponse | imi.Status> {
                    return JSON.parse(await that.infomark.agent.post(that.route(["auth", "sessions"]), { email: email, plain_password: password }));
                },
            // https://infomark.org/swagger/#/auth/delete_auth_sessions
            delete: async function(token: string)
                : Promise<imi.AuthResponse | true> {
                    const res = await that.infomark.agent.delete(that.route(["auth", "sessions"]), token);
                    return res !== "" ? JSON.parse(res) : true;
                }
        };
    }

    /**
    * https://infomark.org/swagger/#/auth/post_auth_token
    */
    public async token(email: string, password: string)
    : Promise<imi.AuthResponse | imi.Status> {
        return JSON.parse(await this.infomark.agent.post(this.route(["auth", "token"]), { email: email, plain_password: password }));
    }

    /**
    * https://infomark.org/swagger/#/auth/post_auth_request_password_reset
    */ 
    public async requestPasswordReset(email: string)
    : Promise<imi.Status | true> {
        const res = await this.infomark.agent.post(this.route(["auth", "request_password_reset"]), { email: email });
        return res !== "" ? JSON.parse(res) : true;
    }

    /*
    * https://infomark.org/swagger/#/auth/post_auth_confirm_email
    */
    public async confirmEmail(email: string, confirmationToken: string)
    : Promise<imi.Status> {
        const res = await this.infomark.agent.post(this.route(["auth", "confirm_email"]), { email: email, confirmation_token: confirmationToken });
        return res !== "" ? JSON.parse(res) : true;
    }

    /*
    * https://infomark.org/swagger/#/auth/post_auth_update_password
    */
    public async updatePassword(email: string, newPassword: string, resetPasswordToken: string)
    : Promise<imi.Status> {
        const res = await this.infomark.agent.post(this.route(["auth", "update_password"]), { email: email, plain_password: newPassword, reset_password_token: resetPasswordToken });
        return res !== "" ? JSON.parse(res) : true;
    }

}

class Account extends Endpoint {
    public constructor(infomark: InfoMark) {
        super(infomark);
    }

    public async examEnrollments(token: string)
    : Promise<imi.ExamEnrollmentResponse[] | imi.Status> {
        return JSON.parse(await this.infomark.agent.get(this.route(["account", "exams", "enrollments"]), token));
    }

    public avatar(): { 
        // https://infomark.org/swagger/#/account/get_account_avatar
        get: (token: string, image: fs.ReadStream) => any | Error, 
        // https://infomark.org/swagger/#/account/post_account_avatar
        post: (token: string) => any | Error, 
        // https://infomark.org/swagger/#/account/delete_account_avatar        
        delete: (token: string) => any | Error
    } {
        return {
            get: () => "not implemented",
            post: () => "not implemented",
            delete: () => "not implemented",
        }
    }

    public account(): { 
        // https://infomark.org/swagger/#/account/get_account
        get: (token: string) => imi.UserResponse,
        // https://infomark.org/swagger/#/account/post_account
        post: (user: imi.CreateUserAccountRequest) => Error,
        // https://infomark.org/swagger/#/account/patch_account
        patch: Function // unclear documentation!
    } {
        return {
            get: (token: string) => { throw "not implemented"; },
            post: (user: imi.CreateUserAccountRequest) =>  { throw "not implemented"; },
            patch: () =>  { throw "not implemented"; }
        }
        throw "not implemented";
    }
}

class Email extends Endpoint {
    public constructor(infomark: InfoMark) {
        super(infomark);
    }

    // https://infomark.org/swagger/#/email/post_users__user_id__emails
    public async emails(userId: number)
    : Promise<imi.Error> {
        throw "not implemented";
    }

    // https://infomark.org/swagger/#/email/post_courses__course_id__groups__group_id__emails
    public async groupEmails(courseId: number, groupId: number)
    : Promise<imi.Error> {
        throw "not implemented";
    }

    // https://infomark.org/swagger/#/email/post_courses__course_id__emails
    public async couseEmails(courseId: number, roles?: string, firstName?: string, lastName?: string, email?: string, subject?: string, languge?: string)
    : Promise<imi.Error> {
        throw "not implemented";
    }
}

class Users extends Endpoint {
    public constructor(infomark: InfoMark) {
        super(infomark);
    }

    public users(): { 
        // https://infomark.org/swagger/#/users/get_users
        get: (token: string) => imi.UserResponse[], 
        // https://infomark.org/swagger/#/users/put_users__user_id_
        put: (token: string, user: imi.UserRequest) => Error, 
        // https://infomark.org/swagger/#/users/delete_users__user_id_
        delete: (token: string, userId: number) => Error 
    } {
        return {
            get: (token: string) => { throw "not implemented"; },
            put: (token: string, user: imi.UserRequest) => { throw "not implemented"; },
            delete: (token: string, userId: number) => { throw "not implemented"; }
        }
    }

    public me(): { 
        // https://infomark.org/swagger/#/users/get_me
        get: (token: string) => imi.UserResponse, 
        // https://infomark.org/swagger/#/users/put_me
        put: (token: string, user: imi.UserMeRequest) => imi.Error 
        
    } {
        return {
            get: (token: string) => { throw "not implemented"; },
            put: (token: string, user: imi.UserMeRequest) => { throw "not implemented"; },
        }
    }

    // https://infomark.org/swagger/#/users/post_users__user_id__emails
    public async emails(userId: number, subject: string, body: string)
    : Promise<imi.Error> {
        throw "not implemented";
    }

    // https://infomark.org/swagger/#/users/get_users__user_id__avatar
    public async avatar(userId: number) {
        throw "not implemented"; // documentation unclear!
    }

    // https://infomark.org/swagger/#/users/get_users_find
    public async find(query: string)
    : Promise<imi.UserResponse> {
        throw "not implemented";
    }
}

class Courses extends Endpoint {
    public constructor(infomark: InfoMark) {
        super(infomark);
    }

    // https://infomark.org/swagger/#/courses/get_courses__course_id__bids
    public async bids(token: string, courseId: number)
    : Promise<any> {
        // FIXME token missing
        return JSON.parse(await this.infomark.agent.get(this.route(["courses", ""+courseId, "bids"])));
    }

    // https://infomark.org/swagger/#/courses/get_courses__course_id__points
    public async points(token: string, courseId: number)
    : Promise<imi.SheetPointsResponse[]> {
        throw "not implemented";
    }

    public courses(): { 
        // https://infomark.org/swagger/#/courses/get_courses
        // https://infomark.org/swagger/#/courses/get_courses__course_id_
        get: (courseId?: number) => imi.CourseResponse | imi.CourseResponse[], 
        // https://infomark.org/swagger/#/courses/post_courses
        post: (name: string, description: string, beginsAt: moment.Moment, endsAt: moment.Moment, requiredPercentage: number) => imi.Error, 
        // https://infomark.org/swagger/#/courses/put_courses__course_id_
        put: (courseId: number, name: string, description: string, beginsAt: moment.Moment, endsAt: moment.Moment, requiredPercentage: number) => imi.Error, 
        // https://infomark.org/swagger/#/courses/delete_courses__course_id_
        delete: (courseId: number) => imi.Error 
    } {
        return {
            get: (courseId?: number) => { throw "not implemented"; },
            post: (name: string, description: string, beginsAt: moment.Moment, endsAt: moment.Moment, requiredPercentage: number) => { throw "not implemented"; },
            put: (courseId: number, name: string, description: string, beginsAt: moment.Moment, endsAt: moment.Moment, requiredPercentage: number) => { throw "not implemented"; },
            delete: (courseId: number) => { throw "not implemented"; },
        }
    }
}

class Sheets extends Endpoint {
    public constructor(infomark: InfoMark) {
        super(infomark);
    }

    public sheets(): { 
        // https://infomark.org/swagger/#/sheets/get_courses__course_id__sheets
        // https://infomark.org/swagger/#/sheets/get_courses__course_id__sheets__sheet_id_
        get: (courseId: number, sheetId?: number) => imi.SheetResponse | imi.SheetResponse[], 
        // https://infomark.org/swagger/#/sheets/post_courses__course_id__sheets
        post: (courseId: number, name: string, dueAt: moment.Moment, publishAt: moment.Moment) => imi.Error, 
        // https://infomark.org/swagger/#/sheets/put_courses__course_id__sheets__sheet_id_
        put: (courseId: number, sheetId: number, name: string, dueAt: moment.Moment, publishAt: moment.Moment) => imi.Error, 
        // https://infomark.org/swagger/#/sheets/delete_courses__course_id__sheets__sheet_id_
        delete: (courseId: number, sheetId: number) => imi.Error
    } {
        throw "not implemented";
    }

    // https://infomark.org/swagger/#/sheets/get_courses__course_id__sheets__sheet_id__points
    public async points(courseId: number, sheetId: number)
    : Promise<imi.SheetPointsResponse[]> { // wild guess, documentation not conclusive
        throw "not implemented";
    }

    public file(): { 
        // https://infomark.org/swagger/#/sheets/get_courses__course_id__sheets__sheet_id__file
        get: (courseId: number, sheetId: number) => imi.Error | imi.Zip, 
        // https://infomark.org/swagger/#/sheets/post_courses__course_id__sheets__sheet_id__file
        post: (courseId: number, sheetId: number, file: fs.ReadStream) => imi.Error  // again, wile guess. No file is specified in doc.
    } { 
        return {
            get: (courseId: number, sheetId: number) => { throw "not implemented"; },
            post: (courseId: number, sheetId: number, file: fs.ReadStream) => { throw "not implemented"; },
        };
    }
}

class Tasks extends Endpoint {
    public constructor(infomark: InfoMark) {
        super(infomark);
    }

    public ratings(): { 
        // https://infomark.org/swagger/#/tasks/get_courses__course_id__tasks__task_id__ratings
        get: (courseId: number, taskId: number) => imi.TaskResponse, 
        // https://infomark.org/swagger/#/tasks/post_courses__course_id__tasks__task_id__ratings
        post: (courseId: number, taskId: number, rating: number) => imi.Error // what is "rating"?!
    } {
        return {
            get: (courseId: number, taskId: number) => { throw "not implemented"; },
            post: (courseId: number, taskId: number, rating: number) => { throw "not implemented"; },
        };
    }

    public publicFile(): { 
        // https://infomark.org/swagger/#/tasks/get_courses__course_id__tasks__task_id__public_file
        get: (courseId: number, taskId: number) => imi.Zip | imi.Error, 
        // https://infomark.org/swagger/#/tasks/post_courses__course_id__tasks__task_id__public_file
        post: (courseId: number, taskId: number, file: fs.ReadStream) => imi.Error // again, wild guess, no file specified.
    } {
        return {
            get: (courseId: number, taskId: number) => { throw "not implemented"; },
            post: (courseId: number, taskId: number, file: fs.ReadStream) => { throw "not implemented"; }
        };
    }

    public privateFile(): {
        // https://infomark.org/swagger/#/tasks/get_courses__course_id__tasks__task_id__private_file
        get: (courseId: number, taskId: number) => imi.Zip | imi.Error, 
        // https://infomark.org/swagger/#/tasks/post_courses__course_id__tasks__task_id__private_file
        post: (courseId: number, taskId: number, file: fs.ReadStream) => imi.Error // again, wild guess, no file specified.
    } {
        return {
            get: (courseId: number, taskId: number) => { throw "not implemented"; },
            post: (courseId: number, taskId: number, file: fs.ReadStream) => { throw "not implemented"; }
        };
    }

    public tasks(): { 
        // https://infomark.org/swagger/#/tasks/get_courses__course_id__tasks__task_id_
        get: (courseId: number, taskId: number) => imi.TaskResponse, 
        // https://infomark.org/swagger/#/tasks/put_courses__course_id__tasks__task_id_
        put: (courseId: number, taskId: number, task: imi.TaskRequest) => imi.Error, 
        // https://infomark.org/swagger/#/tasks/delete_courses__course_id__tasks__task_id_
        delete: (courseId: number, taskId: number) => imi.Error
    } {
        throw "not implemented";
    }

    // https://infomark.org/swagger/#/tasks/get_courses__course_id__tasks_missing
    public async missing()
    : Promise<imi.MissingTaskResponse[] | imi.Error> {
        throw "not implemented";
    }

    // https://infomark.org/swagger/#/tasks/get_courses__course_id__tasks__task_id__result
    public async result(courseId: number, taskId: number)
    : Promise<imi.GradeResponse> {
        throw "not implemented";
    }

    public sheetTasks(courseId: number, sheetId: number)
    : { 
        // https://infomark.org/swagger/#/tasks/get_courses__course_id__sheets__sheet_id__tasks
        get: (courseId: number, sheetId: number) => imi.TaskPointsResponse2[], 
        // https://infomark.org/swagger/#/tasks/post_courses__course_id__sheets__sheet_id__tasks
        post: (courseId: number, sheedId: number, task: imi.TaskRequest) => imi.Error
    } {
        return {
            get: (courseId: number, sheetId: number) => { throw "not implemented"; }, 
            post: (courseId: number, sheedId: number, task: imi.TaskRequest) => { throw "not implemented"; }   
        };        
    }

}

class Submissions extends Endpoint {
    public constructor(infomark: InfoMark) {
        super(infomark);
    }

    // https://infomark.org/swagger/#/submissions/get_courses__course_id__submissions
    public async submissions(courseId: number, sheetId?: number, taskId?: number, groupId?: number, userId?: number)
    : Promise<imi.SubmissionResponse[]> {
        throw "not implemented";
    }

    // https://infomark.org/swagger/#/submissions/get_courses__course_id__tasks__task_id__groups__group_id_
    public async groupTasks(courseId: number, taskId: number, groupId: number)
    : Promise<imi.Zip> {
        throw "not implemented";
    }

    // https://infomark.org/swagger/#/submissions/get_courses__course_id__tasks__task_id__groups__group_id__file
    public async groupTasksFile(courseId: number, taskId: number, groupId: number)
    : Promise<imi.Zip> {
        throw "not implemented";
    }

    // https://infomark.org/swagger/#/submissions/get_courses__course_id__submissions__submission_id__file
    public async file(courseId: number, submissionId: number)  
    : Promise<imi.Zip> {
        throw "not implemented";
    }

    public submission(): { 
        // https://infomark.org/swagger/#/submissions/get_courses__course_id__tasks__task_id__submission
        get: (courseId: number, taskId: number) => imi.Zip | imi.Error, 
        // https://infomark.org/swagger/#/submissions/post_courses__course_id__tasks__task_id__submission
        post: (courseId: number, taskId: number, file: fs.ReadStream) => imi.Error 
    } {
        throw "not implemented";
    }
}

class Grades extends Endpoint {
    public constructor(infomark: InfoMark) {
        super(infomark);
    }
    // https://infomark.org/swagger/#/grades/get_courses__course_id__grades_summary
    // No conclusive documentation!
    public async summary(courseId: number, groupId: number)
    : Promise<void> {
        throw "not implemented";
    }

    // https://infomark.org/swagger/#/grades/get_courses__course_id__grades_missing
    public async missing()
    : Promise<imi.MissingTaskResponse[]>  {
        throw "not implemented";
    }

    public grades(): { 
        // https://infomark.org/swagger/#/grades/get_courses__course_id__grades__grade_id_
        get: (courseId: number, gradeId: number) => imi.GradeResponse | imi.Error, 
        // https://infomark.org/swagger/#/grades/put_courses__course_id__grades__grade_id_
        put: (courseId: number, gradeId: number, acquiredPoints: number, feedback: string) => imi.Error
    } {
        return {
            get: (courseId: number, gradeId: number) => { throw "not implemented"; },
            put: (courseId: number, gradeId: number, acquiredPoints: number, feedback: string) => { throw "not implemented"; }        
        }
    }
}

class Groups extends Endpoint {
    public constructor(infomark: InfoMark) {
        super(infomark);
    }

    // https://infomark.org/swagger/#/groups/post_courses__course_id__groups__group_id__enrollments
    public async enrollments(courseId: number, groupId: number, userId: number)
    : Promise<void>  {
        // API does not specify what is returned
        throw "not implemented";
    }

    public groups(): { 
        // https://infomark.org/swagger/#/groups/get_courses__course_id__groups
        get: (courseId: number) => imi.GroupResponse[], // example return from doc does not match data type. tutor field is missing there.
        // https://infomark.org/swagger/#/groups/post_courses__course_id__groups
        post: (courseId: number, description: string, tutorId: number) => imi.Error, // missing parameters? publish_at? due_at? ...
        // https://infomark.org/swagger/#/groups/put_courses__course_id__groups__group_id_
        put: (courseId: number, groupId: number) => imi.Error, 
        // https://infomark.org/swagger/#/groups/delete_courses__course_id__groups__group_id_
        delete: (courseId: number, groupId: number) => imi.Error 
    } {
       return {
            get: (courseId: number) => { throw "not implemented"; },
            post: (courseId: number, description: string, tutorId: number) => { throw "not implemented"; },
            put: (courseId: number, groupId: number) => { throw "not implemented"; },
            delete: (courseId: number, groupId: number) => { throw "not implemented"; }
       };
    }

    // https://infomark.org/swagger/#/groups/post_courses__course_id__groups__group_id__bids
    public async bids(courseId: number, groupId: number, bid: imi.Bid)
    : Promise<imi.Error> {
        throw "not implemented";
    }

    // https://infomark.org/swagger/#/groups/get_courses__course_id__groups_own
    public async own(courseId: number)
    : Promise<imi.GroupResponse[]> { // example return from doc does not match data type. tutor field is missing there.
        throw "not implemented";
    }
}

class Enrollments extends Endpoint {
    public constructor(infomark: InfoMark) {
        super(infomark);
    }

    public async groupEnrollments(courseId: number, groupId: number) {
        throw "not implemented";
    }

    public enrollments(): { 
        // https://infomark.org/swagger/#/enrollments/get_courses__course_id__groups__group_id__enrollments
        get: (courseId: number, groupId: number, roles?: string, firstName?: string, lastName?: string, email?: string, subject?: string, language?: string) => imi.EnrollmentResponse[]
        // https://infomark.org/swagger/#/enrollments/put_courses__course_id__enrollments__user_id_
        put: (courseId: number, userId: number, role: number) => imi.Error, 
        // https://infomark.org/swagger/#/enrollments/post_courses__course_id__enrollments
        post: (courseId: number, data: any) => imi.Error, // missing request body description in doc 
        // https://infomark.org/swagger/#/enrollments/delete_courses__course_id__enrollments__user_id_
        delete: (courseId: number, userId: number) => imi.Error 
    } { // naming not conforming with API!
        return {
            get: (courseId: number, groupId: number, roles?: string, firstName?: string, lastName?: string, email?: string, subject?: string, language?: string) => { throw "not implemented"; },
            put: (courseId: number, userId: number, role: number) => { throw "not implemented"; },
            post: (courseId: number, data: any) => { throw "not implemented"; },
            delete: (courseId: number, userId: number) => { throw "not implemented"; }
        };
    }
}

class Materials extends Endpoint {
    public constructor(infomark: InfoMark) {
        super(infomark);
    }

    public file(): { 
        get: Function, 
        post: Function 
    } {
        throw "not implemented";
    }

    public materials(): { 
        get: Function, 
        put: Function, 
        delete: Function 
    } {
        throw "not implemented";
    }
}

class Internal extends Endpoint {
    public constructor(infomark: InfoMark) {
        super(infomark);
    }

    public async publicResult(courseId: number, gradeId: number) {
        throw "not implemented";
    }

    public async privateResult(courseId: number, gradeId: number) {
        throw "not implemented";
    }
}

class Exams extends Endpoint {
    public constructor(infomark: InfoMark) {
        super(infomark);
    }

    public courses(): { 
        get: Function, 
        post: Function, 
        put: Function, 
        delete: Function 
    } {
        throw "not implemented";
    }

    public enrollments(): { 
        get: Function, 
        post: Function, 
        delete: Function, 
        put: Function 
    } {
        throw "not implemented";
    }
}

export class InfoMark {
    public readonly protocol: string;
    public readonly host: string;
    public readonly port: number;
    public readonly agent: Agent;
    public readonly common: Common;
    public readonly auth: Auth;
    public readonly account: Account;
    public readonly email: Email;
    public readonly users: Users;
    public readonly courses: Courses;
    public readonly sheets: Sheets;
    public readonly tasks: Tasks;
    public readonly submissions: Submissions;
    public readonly grades: Grades;
    public readonly groups: Groups;
    public readonly materials: Materials;
    public readonly internal: Internal;
    public readonly exams: Exams;

    public constructor(host: string, port: number, ssl: boolean = true) {
        this.host = host;
        this.port = port;
        this.protocol = ssl ? "https" : "http";
        this.agent = new Agent(host, port, ssl ? https : http);
        this.common = new Common(this);
        this.account = new Account(this);
        this.auth = new Auth(this);
        this.email = new Email(this);
        this.users = new Users(this);
        this.courses = new Courses(this);
        this.sheets = new Sheets(this);
        this.tasks = new Tasks(this);
        this.submissions = new Submissions(this);
        this.grades = new Grades(this);
        this.groups = new Groups(this);
        this.materials = new Materials(this);
        this.internal = new Internal(this);
        this.exams = new Exams(this);
    }
}
