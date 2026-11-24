const FEATURES = [
    "attendance_rate",
    "study_hours",
    "assignment_score",
    "quiz_score",
    "completion_rate",
    "previous_score",
];
const RISK_CLASSES = ["Cao", "Trung bình", "Thấp"];
const MAX_ROWS = 5000;
const FEATURE_SCALES = [1, 40, 10, 10, 1, 10];
const SEED = 42;

function invalidCsv(message) {
    const error = new Error(message);
    error.status = 400;
    return error;
}

function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = "";
    let quoted = false;
    let closedQuote = false;
    const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

    for (let index = 0; index < source.length; index += 1) {
        const character = source[index];
        if (quoted) {
            if (character === '"') {
                if (source[index + 1] === '"') {
                    field += '"';
                    index += 1;
                } else {
                    quoted = false;
                    closedQuote = true;
                }
            } else {
                field += character;
            }
            continue;
        }

        if (closedQuote && character !== "," && character !== "\r" &&
            character !== "\n" && !/\s/.test(character)) {
            throw invalidCsv("CSV có ký tự không hợp lệ sau dấu ngoặc kép.");
        }
        if (character === '"') {
            if (field.length > 0) {
                throw invalidCsv("CSV có dấu ngoặc kép không hợp lệ.");
            }
            quoted = true;
        } else if (character === ",") {
            row.push(field);
            field = "";
            closedQuote = false;
        } else if (character === "\n" || character === "\r") {
            if (character === "\r" && source[index + 1] === "\n") index += 1;
            row.push(field);
            if (row.some((value) => value.trim() !== "")) rows.push(row);
            row = [];
            field = "";
            closedQuote = false;
        } else {
            field += character;
        }
    }

    if (quoted) throw invalidCsv("CSV chưa đóng dấu ngoặc kép.");
    row.push(field);
    if (row.some((value) => value.trim() !== "")) rows.push(row);
    return rows;
}

function validateRows(text) {
    const rows = parseCsv(text);
    if (rows.length < 2) {
        throw invalidCsv("CSV phải có tiêu đề và ít nhất một dòng dữ liệu.");
    }

    const headers = rows[0].map((header) => header.trim());
    if (new Set(headers).size !== headers.length) {
        throw invalidCsv("CSV có tên cột bị lặp.");
    }
    const requiredColumns = [...FEATURES, "final_score"];
    const missingColumns = requiredColumns.filter((column) => !headers.includes(column));
    if (missingColumns.length) {
        throw invalidCsv(`CSV thiếu cột bắt buộc: ${missingColumns.join(", ")}.`);
    }
    if (rows.length - 1 > MAX_ROWS) {
        throw invalidCsv(`Mỗi file chỉ hỗ trợ tối đa ${MAX_ROWS} dòng dữ liệu.`);
    }

    const indexes = Object.fromEntries(headers.map((header, index) => [header, index]));
    const data = rows.slice(1).map((values, rowIndex) => {
        if (values.length !== headers.length) {
            throw invalidCsv(`Số cột không hợp lệ ở dòng ${rowIndex + 2}.`);
        }
        const record = {};
        for (const feature of FEATURES) {
            const rawValue = values[indexes[feature]].trim();
            const value = rawValue === "" ? Number.NaN : Number(rawValue);
            if (!Number.isFinite(value)) {
                throw invalidCsv(`Giá trị ${feature} không hợp lệ ở dòng ${rowIndex + 2}.`);
            }
            record[feature] = value;
        }
        const rawScore = values[indexes.final_score].trim();
        const score = rawScore === "" ? Number.NaN : Number(rawScore);
        if (!Number.isFinite(score) || score < 0 || score > 10) {
            throw invalidCsv(`Điểm final_score không hợp lệ ở dòng ${rowIndex + 2}.`);
        }
        if (
            record.attendance_rate < 0 || record.attendance_rate > 1 ||
            record.completion_rate < 0 || record.completion_rate > 1 ||
            record.study_hours < 0 || record.study_hours > 40 ||
            ["assignment_score", "quiz_score", "previous_score"].some(
                (feature) => record[feature] < 0 || record[feature] > 10,
            )
        ) {
            throw invalidCsv(`Chỉ số ngoài phạm vi cho phép ở dòng ${rowIndex + 2}.`);
        }
        const providedRisk = indexes.risk_level === undefined
            ? ""
            : values[indexes.risk_level].trim();
        if (providedRisk && !RISK_CLASSES.includes(providedRisk)) {
            throw invalidCsv(`risk_level không hợp lệ ở dòng ${rowIndex + 2}.`);
        }
        record.final_score = score;
        record.risk_level = providedRisk ||
            (score < 5 ? "Cao" : score < 7 ? "Trung bình" : "Thấp");
        return record;
    });

    if (data.length < 5) {
        throw invalidCsv("Cần ít nhất 5 dòng dữ liệu để đánh giá mô hình.");
    }
    return data;
}

function seededShuffle(values) {
    const result = [...values];
    let state = SEED;
    for (let index = result.length - 1; index > 0; index -= 1) {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        const target = state % (index + 1);
        [result[index], result[target]] = [result[target], result[index]];
    }
    return result;
}

function normalizedFeatures(record) {
    return FEATURES.map((feature, index) => record[feature] / FEATURE_SCALES[index]);
}

function solveLinearSystem(matrix, values) {
    const size = values.length;
    const augmented = matrix.map((row, index) => [...row, values[index]]);

    for (let column = 0; column < size; column += 1) {
        let pivot = column;
        for (let row = column + 1; row < size; row += 1) {
            if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) {
                pivot = row;
            }
        }
        if (Math.abs(augmented[pivot][column]) < 1e-12) continue;
        [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];

        const divisor = augmented[column][column];
        for (let index = column; index <= size; index += 1) {
            augmented[column][index] /= divisor;
        }
        for (let row = 0; row < size; row += 1) {
            if (row === column) continue;
            const factor = augmented[row][column];
            for (let index = column; index <= size; index += 1) {
                augmented[row][index] -= factor * augmented[column][index];
            }
        }
    }
    return augmented.map((row) => row[size]);
}

function trainRegressor(records) {
    const dimensions = FEATURES.length + 1;
    const matrix = Array.from({ length: dimensions }, () => Array(dimensions).fill(0));
    const values = Array(dimensions).fill(0);

    for (const record of records) {
        const features = [1, ...normalizedFeatures(record)];
        for (let row = 0; row < dimensions; row += 1) {
            values[row] += features[row] * record.final_score;
            for (let column = 0; column < dimensions; column += 1) {
                matrix[row][column] += features[row] * features[column];
            }
        }
    }
    for (let index = 1; index < dimensions; index += 1) {
        matrix[index][index] += 0.01;
    }
    return solveLinearSystem(matrix, values);
}

function predictScore(coefficients, record) {
    const features = [1, ...normalizedFeatures(record)];
    return features.reduce((sum, value, index) => sum + value * coefficients[index], 0);
}

function trainClassifier(records) {
    return Object.fromEntries(RISK_CLASSES.map((label) => {
        const classRecords = records.filter((record) => record.risk_level === label);
        const means = FEATURES.map((feature, index) => (
            classRecords.reduce(
                (sum, record) => sum + record[feature] / FEATURE_SCALES[index],
                0,
            ) / Math.max(classRecords.length, 1)
        ));
        const variances = FEATURES.map((feature, index) => (
            classRecords.reduce((sum, record) => {
                const difference = record[feature] / FEATURE_SCALES[index] - means[index];
                return sum + difference ** 2;
            }, 0) / Math.max(classRecords.length, 1) + 1e-6
        ));
        return [label, { count: classRecords.length, means, variances }];
    }));
}

function predictRisk(classifier, totalRecords, record) {
    const features = normalizedFeatures(record);
    let winner = null;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (const label of RISK_CLASSES) {
        const statistics = classifier[label];
        if (!statistics.count) continue;
        let score = Math.log(statistics.count / totalRecords);
        for (let index = 0; index < features.length; index += 1) {
            const variance = statistics.variances[index];
            const difference = features[index] - statistics.means[index];
            score -= 0.5 * (Math.log(2 * Math.PI * variance) + difference ** 2 / variance);
        }
        if (score > bestScore) {
            winner = label;
            bestScore = score;
        }
    }
    return winner || RISK_CLASSES[0];
}

function calculateRegressionMetrics(actual, predicted, baselineScore) {
    const mean = actual.reduce((sum, value) => sum + value, 0) / actual.length;
    const squaredError = actual.reduce(
        (sum, value, index) => sum + (value - predicted[index]) ** 2,
        0,
    );
    const totalSquaredError = actual.reduce((sum, value) => sum + (value - mean) ** 2, 0);
    const absoluteError = actual.reduce(
        (sum, value, index) => sum + Math.abs(value - predicted[index]),
        0,
    );
    const baselineSquaredError = actual.reduce(
        (sum, value) => sum + (value - baselineScore) ** 2,
        0,
    );
    return {
        mae: round(absoluteError / actual.length),
        rmse: round(Math.sqrt(squaredError / actual.length)),
        r2_score: totalSquaredError ? round(1 - squaredError / totalSquaredError) : 0,
        baseline_r2: totalSquaredError
            ? round(1 - baselineSquaredError / totalSquaredError)
            : 0,
    };
}

function calculateClassificationMetrics(actual, predicted) {
    const matrix = RISK_CLASSES.map(() => RISK_CLASSES.map(() => 0));
    for (let index = 0; index < actual.length; index += 1) {
        matrix[RISK_CLASSES.indexOf(actual[index])][RISK_CLASSES.indexOf(predicted[index])] += 1;
    }
    const classMetrics = RISK_CLASSES.map((_label, index) => {
        const truePositive = matrix[index][index];
        const predictedCount = matrix.reduce((sum, row) => sum + row[index], 0);
        const actualCount = matrix[index].reduce((sum, count) => sum + count, 0);
        const precision = predictedCount ? truePositive / predictedCount : 0;
        const recall = actualCount ? truePositive / actualCount : 0;
        return {
            precision,
            recall,
            f1: precision + recall ? 2 * precision * recall / (precision + recall) : 0,
        };
    });
    return {
        accuracy: round(matrix.reduce((sum, row, index) => sum + row[index], 0) / actual.length),
        macro_precision: round(classMetrics.reduce((sum, metric) => sum + metric.precision, 0) / RISK_CLASSES.length),
        macro_recall: round(classMetrics.reduce((sum, metric) => sum + metric.recall, 0) / RISK_CLASSES.length),
        macro_f1: round(classMetrics.reduce((sum, metric) => sum + metric.f1, 0) / RISK_CLASSES.length),
        classes: RISK_CLASSES,
        confusion_matrix: matrix,
    };
}

function round(value) {
    return Math.round(value * 10000) / 10000;
}

export function createCsvModelInfo(text, fileName) {
    const records = validateRows(text);
    const shuffled = seededShuffle(records);
    const testSize = Math.max(2, Math.floor(records.length * 0.2));
    const testRecords = shuffled.slice(0, testSize);
    const trainRecords = shuffled.slice(testSize);
    const coefficients = trainRegressor(trainRecords);
    const classifier = trainClassifier(trainRecords);
    const baselineScore = trainRecords.reduce((sum, record) => sum + record.final_score, 0) /
        trainRecords.length;
    const actualScores = testRecords.map((record) => record.final_score);
    const predictedScores = testRecords.map((record) => predictScore(coefficients, record));
    const featureWeights = coefficients.slice(1).map(Math.abs);
    const weightTotal = featureWeights.reduce((sum, value) => sum + value, 0);
    const featureImportances = Object.fromEntries(FEATURES.map((feature, index) => [
        feature,
        weightTotal ? round(featureWeights[index] / weightTotal) : 0,
    ]));
    const fileLabel = typeof fileName === "string" && fileName
        ? fileName
        : "selected.csv";

    return {
        success: true,
        data_mode: "uploaded_csv",
        is_demo: false,
        model_name: `EduInsight CSV Model - ${fileLabel}`,
        algorithm_regression: "Ridge Regression",
        algorithm_classification: "Gaussian Naive Bayes",
        trained_at: new Date().toISOString(),
        model_version: "csv-ridge-nb-v1",
        total_training_samples: trainRecords.length,
        features: FEATURES,
        regression_metrics: calculateRegressionMetrics(
            actualScores,
            predictedScores,
            baselineScore,
        ),
        classification_metrics: calculateClassificationMetrics(
            testRecords.map((record) => record.risk_level),
            testRecords.map((record) => predictRisk(classifier, trainRecords.length, record)),
        ),
        feature_importances: featureImportances,
        dataset_info: {
            name: fileLabel,
            record_count: records.length,
            train_test_split: `${trainRecords.length}/${testRecords.length}`,
            random_seed: SEED,
        },
        actual_vs_predicted: testRecords.map((record, index) => ({
            actual: record.final_score,
            predicted: round(predictedScores[index]),
        })),
        metrics_notice: "Metrics được tính từ file CSV đã chọn trên tập kiểm tra; độ tin cậy phụ thuộc số lượng và chất lượng dữ liệu.",
    };
}
