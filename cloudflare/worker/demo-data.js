const COURSES = [
    { course_id: "DEMO-CS101", course_name: "Cơ sở lập trình" },
    { course_id: "DEMO-CS102", course_name: "Cấu trúc dữ liệu" },
    { course_id: "DEMO-CS103", course_name: "Cơ sở dữ liệu" },
    { course_id: "DEMO-CS104", course_name: "Phân tích dữ liệu" },
];
const LEARNING_PATH_TOPICS = [
    {
        topic_name: "Thuật toán cơ bản và hàm",
        resource_url: "https://docs.python.org/3/tutorial/",
        learning_materials: "Ôn kiểu dữ liệu, biểu thức, rẽ nhánh, vòng lặp và cách chia chương trình thành hàm.",
        practice_exercises: "Viết hàm kiểm tra số nguyên tố, tính tổng dãy số và xử lý danh sách đầu vào.",
    },
    {
        topic_name: "Danh sách, ngăn xếp và hàng đợi",
        resource_url: "https://runestone.academy/ns/books/published/pythonds3/index.html",
        learning_materials: "Học cách cài đặt danh sách liên kết, ngăn xếp, hàng đợi và phân tích độ phức tạp cơ bản.",
        practice_exercises: "Cài đặt stack/queue và giải bài toán dấu ngoặc cân bằng, hàng đợi tác vụ.",
    },
    {
        topic_name: "Truy vấn SQL, JOIN và lọc dữ liệu",
        resource_url: "https://sqlbolt.com/",
        learning_materials: "Ôn SELECT, WHERE, GROUP BY, JOIN và cách kết hợp dữ liệu từ nhiều bảng.",
        practice_exercises: "Viết truy vấn thống kê điểm trung bình theo lớp và tìm sinh viên chưa hoàn thành bài.",
    },
    {
        topic_name: "Làm sạch dữ liệu và phân tích khám phá",
        resource_url: "https://pandas.pydata.org/docs/getting_started/intro_tutorials/",
        learning_materials: "Thực hành đọc dữ liệu, xử lý giá trị thiếu, kiểm tra ngoại lệ và tóm tắt dữ liệu.",
        practice_exercises: "Dùng pandas làm sạch một bảng CSV nhỏ và tạo thống kê mô tả cho các cột số.",
    },
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
            created_at: "2026-01-01T00:00:00.000Z",
            is_seed_data: true,
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

function createAdditionalRecords(students) {
    return students.flatMap((student) => COURSES.map((course) => {
        const attendanceRate = Number(student.attendance_rate);
        const completionRate = Number(student.completion_rate);
        const studyHours = Number(student.study_hours);
        const assignmentScore = Number(student.assignment_score);
        const quizScore = Number(student.quiz_score);
        const previousScore = Number(student.previous_score);
        const finalScore = calculateScore({
            attendance_rate: attendanceRate,
            study_hours: studyHours,
            assignment_score: assignmentScore,
            quiz_score: quizScore,
            completion_rate: completionRate,
            previous_score: previousScore,
        });
        const predictedScore = round(
            finalScore * 0.6 +
            attendanceRate * 10 * 0.2 +
            completionRate * 10 * 0.2,
        );
        return {
            ...student,
            ...course,
            attendance_rate: attendanceRate,
            study_hours: studyHours,
            assignment_score: assignmentScore,
            quiz_score: quizScore,
            completion_rate: completionRate,
            previous_score: previousScore,
            final_score: finalScore,
            predicted_score: predictedScore,
            risk_level: getRiskLevel(predictedScore, attendanceRate),
            is_seed_data: false,
        };
    }));
}

function calculateScore(input) {
    return round(
        input.assignment_score * 0.25 +
        input.quiz_score * 0.25 +
        input.previous_score * 0.2 +
        input.completion_rate * 10 * 0.15 +
        input.attendance_rate * 10 * 0.15,
    );
}

function getRiskLevel(score, attendanceRate) {
    return score < 5.5 || attendanceRate < 0.65
        ? "Cao"
        : score < 7
            ? "Trung bình"
            : "Thấp";
}

function recordsFromSources(additionalStudents = [], storedRecords = []) {
    const seedRecords = storedRecords.length ? storedRecords : DEMO_RECORDS;
    const seededIds = new Set(seedRecords.map((record) => record.student_id));
    const extraStudents = additionalStudents.filter(
        (student) => !seededIds.has(student.student_id),
    );
    return [...seedRecords, ...createAdditionalRecords(extraStudents)];
}

export function createDemoSeedRecords() {
    return DEMO_RECORDS.map((record) => ({ ...record }));
}

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

function filteredRecords(
    { className, courseId } = {},
    additionalStudents = [],
    storedRecords = [],
) {
    return recordsFromSources(additionalStudents, storedRecords).filter((record) =>
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

export function createDemoDashboardOverview(
    filters = {},
    additionalStudents = [],
    storedRecords = [],
) {
    const records = filteredRecords(filters, additionalStudents, storedRecords);
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

export function createDemoAnalytics(additionalStudents = [], storedRecords = []) {
    const records = recordsFromSources(additionalStudents, storedRecords);
    const topicDefinitions = [
        { topic_name: "Chuyên cần", field: "attendance_rate", scale: 10 },
        { topic_name: "Bài tập", field: "assignment_score", scale: 1 },
        { topic_name: "Kiểm tra", field: "quiz_score", scale: 1 },
        { topic_name: "Tiến độ hoàn thành", field: "completion_rate", scale: 10 },
    ];

    return {
        success: true,
        data_mode: "synthetic_demo",
        study_hours_correlation: records.map((record) => ({
            student_id: record.student_id,
            study_hours: record.study_hours,
            final_score: record.final_score,
        })),
        attendance_correlation: records.map((record) => ({
            student_id: record.student_id,
            attendance_pct: round(record.attendance_rate * 100),
            final_score: record.final_score,
        })),
        topic_performance: topicDefinitions.map(({ topic_name, field, scale }) => {
            const values = records.map((record) => record[field] * scale);
            return {
                topic_name,
                avg_score: round(values.reduce((sum, value) => sum + value, 0) / values.length),
                weak_students_count: values.filter((value) => value < 5).length,
            };
        }),
        course_scores: COURSES.map((course) => {
            const courseRecords = records.filter(
                (record) => record.course_id === course.course_id,
            );
            return {
                course_name: course.course_name,
                avg_score: round(average(courseRecords, "final_score")),
            };
        }),
    };
}

export function createDemoStudentList(additionalStudents = [], storedRecords = []) {
    const records = recordsFromSources(additionalStudents, storedRecords);
    const summaries = summarizeStudents(records);
    return summaries.map((summary) => {
        const studentRecords = records.filter(
            (record) => record.student_id === summary.student_id,
        );
        const first = studentRecords[0];
        return {
            ...summary,
            average_score: summary.final_score,
            completion_rate: round(average(studentRecords, "completion_rate")),
            created_at: first.created_at,
            is_seed_data: first.is_seed_data,
        };
    });
}

export function createDemoStudentDetails(
    studentId,
    additionalStudents = [],
    storedRecords = [],
) {
    const records = recordsFromSources(additionalStudents, storedRecords).filter(
        (record) => record.student_id === studentId,
    );
    if (records.length === 0) return null;

    const student = createDemoStudentList(additionalStudents, storedRecords).find(
        (item) => item.student_id === studentId,
    );
    return {
        success: true,
        data_mode: "synthetic_demo",
        student,
        learning_records: records.map((record) => ({
            attendance_rate: record.attendance_rate,
            study_hours: record.study_hours,
            quiz_score: record.quiz_score,
        })),
        topic_results: records.map((record, index) => ({
            topic_id: index + 1,
            topic_name: record.course_name,
            score: record.final_score,
        })),
    };
}

export function demoStudentIdForPathId(pathId) {
    if (!Number.isSafeInteger(pathId) || pathId < 11) return null;
    const studentNumber = Math.floor(pathId / 10);
    const topicNumber = pathId % 10;
    if (studentNumber < 1 || topicNumber < 1 || topicNumber > LEARNING_PATH_TOPICS.length) {
        return null;
    }
    return `DEMO-${String(studentNumber).padStart(4, "0")}`;
}

export function createDemoLearningPath(
    studentId,
    additionalStudents = [],
    savedStatuses = [],
    storedRecords = [],
) {
    const match = /^DEMO-(\d{4,})$/.exec(studentId);
    if (!match) return null;
    const studentNumber = Number(match[1]);
    if (
        !Number.isSafeInteger(studentNumber) ||
        studentNumber < 1 ||
        studentNumber > Math.floor((Number.MAX_SAFE_INTEGER - 4) / 10) ||
        studentId !== `DEMO-${String(studentNumber).padStart(4, "0")}`
    ) return null;

    const records = recordsFromSources(additionalStudents, storedRecords).filter(
        (record) => record.student_id === studentId,
    );
    if (records.length !== LEARNING_PATH_TOPICS.length) return null;

    const statusByPathId = new Map(savedStatuses.map(({ path_id, status }) => [
        Number(path_id),
        status,
    ]));
    const learningPath = records.map((record, index) => {
        const pathId = studentNumber * 10 + index + 1;
        const score = record.final_score;
        const priority = score < 5
            ? "Ưu tiên cao"
            : score < 7
                ? "Ưu tiên trung bình"
                : score < 8.5
                    ? "Ưu tiên thấp"
                    : "Mở rộng";
        return {
            path_id: pathId,
            student_id: studentId,
            course_id: record.course_id,
            topic_name: LEARNING_PATH_TOPICS[index].topic_name,
            priority,
            resource_url: LEARNING_PATH_TOPICS[index].resource_url,
            status: statusByPathId.get(pathId) || "Chưa hoàn thành",
            current_score: score,
            target_goal: "Mục tiêu: đạt ít nhất 7/10 ở chủ đề này.",
            learning_materials: LEARNING_PATH_TOPICS[index].learning_materials,
            practice_exercises: LEARNING_PATH_TOPICS[index].practice_exercises,
        };
    });

    return {
        success: true,
        data_mode: "synthetic_demo",
        learning_path: learningPath,
    };
}

export function createDemoPrediction(input) {
    const rawScore =
        0.15 * input.attendance_rate * 10 +
        0.12 * input.study_hours / 3 +
        0.22 * input.assignment_score +
        0.2 * input.quiz_score +
        0.13 * input.completion_rate * 10 +
        0.18 * input.previous_score +
        0.25 * (input.assignment_score * input.quiz_score / 10 - 4);
    const predictedScore = round(Math.min(10, Math.max(0, rawScore)));
    const riskLevel = predictedScore < 5
        ? "Cao"
        : predictedScore < 7
            ? "Trung bình"
            : "Thấp";
    const factors = [
        {
            factor: "Chuyên cần",
            value: input.attendance_rate,
            threshold: 0.8,
            current_value: `${Math.round(input.attendance_rate * 100)}%`,
            recommended: "Ít nhất 80%",
            advice: "Tham gia đầy đủ các buổi học.",
        },
        {
            factor: "Giờ tự học",
            value: input.study_hours,
            threshold: 8,
            current_value: `${input.study_hours} giờ/tuần`,
            recommended: "Ít nhất 8 giờ/tuần",
            advice: "Phân bổ thời gian tự học đều trong tuần.",
        },
        {
            factor: "Điểm bài tập",
            value: input.assignment_score,
            threshold: 6,
            current_value: `${input.assignment_score}/10`,
            recommended: "Ít nhất 6/10",
            advice: "Ôn lại các bài tập chưa đạt.",
        },
        {
            factor: "Điểm kiểm tra",
            value: input.quiz_score,
            threshold: 6,
            current_value: `${input.quiz_score}/10`,
            recommended: "Ít nhất 6/10",
            advice: "Luyện tập thêm với các nội dung còn yếu.",
        },
        {
            factor: "Tiến độ hoàn thành",
            value: input.completion_rate,
            threshold: 0.7,
            current_value: `${Math.round(input.completion_rate * 100)}%`,
            recommended: "Ít nhất 70%",
            advice: "Hoàn thành các nội dung học tập còn dang dở.",
        },
    ];
    const factorsToImprove = factors
        .filter((factor) => factor.value < factor.threshold)
        .map(({ value, threshold, ...factor }) => ({
            ...factor,
            severity: value < threshold * 0.75 ? "Cao" : "Cảnh báo",
        }));

    return {
        success: true,
        data_mode: "synthetic_demo",
        predicted_score: predictedScore,
        risk_level: riskLevel,
        pass_probability: Math.round(100 / (1 + Math.exp(-(predictedScore - 5) * 1.2))),
        model_version: "demo-heuristic-v1",
        factors_to_improve: factorsToImprove,
        action_advice: riskLevel === "Cao"
            ? "Đây là kết quả DEMO. Hãy xem lại các chỉ số thấp trong danh sách gợi ý."
            : "Đây là kết quả DEMO để minh họa; không dùng làm đánh giá thực tế.",
        prediction_saved: false,
    };
}
