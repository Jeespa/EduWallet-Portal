declare module 'eduwallet-sdk' { 
    export interface CourseInfo { code: string; name: string; degreeCourse: string; ects: number; }
    export interface Evaluation {
        code: string;
        evaluationDate: string;
        grade: string;
        certificate: string | null;
    }

    export enum PermissionType {
        Read = 'Read',
        Write = 'Write'
    }

    const eduwallet: any;
    export default eduwallet;
}
// Note: This is a placeholder declaration file for the 'eduwallet-sdk' module.
// You should replace the 'any' type with actual types and interfaces as per the module's implementation.