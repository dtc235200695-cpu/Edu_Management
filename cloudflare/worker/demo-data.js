const COURSES = [
    { course_id: "DEMO-CS101", course_name: "Cơ sở lập trình" },
    { course_id: "DEMO-CS102", course_name: "Cấu trúc dữ liệu" },
    { course_id: "DEMO-CS103", course_name: "Cơ sở dữ liệu" },
    { course_id: "DEMO-CS104", course_name: "Phân tích dữ liệu" },
];

const CLASSES = [
    "K20-CNTT-01",
    "K21-KTPM-01",
    "K22-KHMT-01",
    "K23-TTĐPT-01",
    "K24-KTĐT-01",
];
const RISK_LEVELS = ["Cao", "Trung bình", "Thấp"];
const round = (value) => Math.round(value * 10) / 10;

function createRecords() {
    return Array.from({ length: 60 }, (_, index) => {
        const studentNumber = index + 1;
        const student = {
            student_id: `DEMO-${String(studentNumber).padStart(4, "0")}`,
            full_name: `Sinh viên DEMO ${String(studentNumber).padStart(3, "0")}`,
            class_name: CLASSES[index % CLASSES.length],
        };

        return COURSES.map((course, courseIndex) => {
            const courseNumber = courseIndex + 1;
            const attendanceRate =
                0.55 + ((studentNumber * 13 + courseNumber * 7) % 46) / 100;
            const completionRate =
                0.45 + ((studentNumber * 11 + courseNumber * 17) % 56) / 100;
            const studyHours =
                2 + ((studentNumber * 7 + courseNumber * 11) % 180) / 10;
            const assignmentScore =
                3 + ((studentNumber * 17 + courseNumber * 13) % 71) / 10;
            const quizScore =
                3 + ((studentNumber * 29 + courseNumber * 19) % 71) / 10;
            const previousScore =
                3 + ((studentNumber * 23 + courseNumber * 5) % 71) / 10;
            const finalScore = round(
                assignmentScore * 0.25 +
                quizScore * 0.25 +
                previousScore * 0.2 +
                completionRate * 10 * 0.15 +
                attendanceRate * 10 * 0.15,
            );
            const predictedScore = round(
                finalScore * 0.6 +
                attendanceRate * 10 * 0.2 +
                completionRate * 10 * 0.2,
            );
            const riskLevel = predictedScore < 5.5 || attendanceRate < 0.65
                ? "Cao"
                : predictedScore < 7
                    ? "Trung bình"
                    : "Thấp";

            return {
                ...student,
                ...course,
                attendance_rate: round(attendanceRate),
                study_hours: round(studyHours),
                assignment_score: round(assignmentScore),
                quiz_score: round(quizScore),
                completion_rate: round(completionRate),
                previous_score: round(previousScore),
                final_score: finalScore,
                predicted_score: predictedScore,
                risk_level: riskLevel,
            };
        });
    }).flat();
}

const DEMO_RECORDS = createRecords();

function average(records, field) {
    if (records.length === 0) return 0;
    return records.reduce((sum, record) => sum + record[field], 0) / records.length;
}

function matchesClass(className, record) {
    return !className ||
        record.class_name === className ||
        record.class_name.startsWith(`${className}-`) ||
        record.class_name.split("-").includes(className);
}

function filteredRecords({ className, courseId } = {}) {
    return DEMO_RECORDS.filter((record) =>
        matchesClass(className, record) &&
        (!courseId || record.course_id === courseId),
    );
}

function summarizeStudents(records) {
    const groups = new Map();
    for (const record of records) {
        if (!groups.has(record.student_id)) groups.set(record.student_id, []);
        groups.get(record.student_id).push(record);
    }

    return Array.from(groups.values(), (studentRecords) => {
        const first = studentRecords[0];
        const finalScore = round(average(studentRecords, "final_score"));
        const predictedScore = round(average(studentRecords, "predicted_score"));
        const attendanceRate = round(average(studentRecords, "attendance_rate"));
        const riskLevel = predictedScore < 5.5 || attendanceRate < 0.65
            ? "Cao"
            : predictedScore < 7
                ? "Trung bình"
                : "Thấp";
        return {
            student_id: first.student_id,
            full_name: first.full_name,
            class_name: first.class_name,
            final_score: finalScore,
            attendance_rate: attendanceRate,
            study_hours: round(average(studentRecords, "study_hours")),
            predicted_score: predictedScore,
            risk_level: riskLevel,
        };
    });
}

export function createDemoDashboardOverview(filters = {}) {
    const records = filteredRecords(filters);
    const students = summarizeStudents(records);
    const riskCounts = Object.fromEntries(RISK_LEVELS.map((level) => [level, 0]));
    const scoreDistribution = {
        under_5: 0,
        range_5_7: 0,
        range_7_85: 0,
        range_85_10: 0,
    };

    for (const student of students) {
        riskCounts[student.risk_level] += 1;
        if (student.final_score < 5) scoreDistribution.under_5 += 1;
        else if (student.final_score < 7) scoreDistribution.range_5_7 += 1;
        else if (student.final_score < 8.5) scoreDistribution.range_7_85 += 1;
        else scoreDistribution.range_85_10 += 1;
    }

    const availableCourses = filters.courseId
        ? COURSES.filter((course) => course.course_id === filters.courseId)
        : COURSES;
    const supportStudents = students
        .filter((student) => student.predicted_score < 6 || student.risk_level === "Cao")
        .sort((left, right) => left.predicted_score - right.predicted_score);

    return {
        success: true,
        data_mode: "synthetic_demo",
        total_students: students.length,
        total_courses: availableCourses.length,
        average_score: round(average(records, "final_score")),
        pass_rate: records.length
            ? Math.round(records.filter((record) => record.final_score >= 5).length / records.length * 100)
            : 0,
        risk_distribution: RISK_LEVELS.map((risk_level) => ({
            risk_level,
            count: riskCounts[risk_level],
        })),
        score_distribution: scoreDistribution,
        students_needing_support: supportStudents,
        filter_options: {
            classes: CLASSES,
            courses: COURSES,
        },
    };
}

export function createDemoAnalytics() {
    const topicDefinitions = [
        { topic_name: "Chuyên cần", field: "attendance_rate", scale: 10 },
        { topic_name: "Bài tập", field: "assignment_score", scale: 1 },
        { topic_name: "Kiểm tra", field: "quiz_score", scale: 1 },
        { topic_name: "Tiến độ hoàn thành", field: "completion_rate", scale: 10 },
    ];

    return {
        success: true,
        data_mode: "synthetic_demo",
        study_hours_correlation: DEMO_RECORDS.map((record) => ({
            student_id: record.student_id,
            study_hours: record.study_hours,
            final_score: record.final_score,
        })),
        attendance_correlation: DEMO_RECORDS.map((record) => ({
            student_id: record.student_id,
            attendance_pct: round(record.attendance_rate * 100),
            final_score: record.final_score,
        })),
        topic_performance: topicDefinitions.map(({ topic_name, field, scale }) => {
            const values = DEMO_RECORDS.map((record) => record[field] * scale);
            return {
                topic_name,
                avg_score: round(values.reduce((sum, value) => sum + value, 0) / values.length),
                weak_students_count: values.filter((value) => value < 5).length,
            };
        }),
        course_scores: COURSES.map((course) => {
            const records = DEMO_RECORDS.filter(
                (record) => record.course_id === course.course_id,
            );
            return {
                course_name: course.course_name,
                avg_score: round(average(records, "final_score")),
            };
        }),
    };
}
