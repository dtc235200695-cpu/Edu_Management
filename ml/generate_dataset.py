import argparse
import csv
from pathlib import Path

import numpy as np


FEATURES = (
    "attendance_rate",
    "study_hours",
    "assignment_score",
    "quiz_score",
    "completion_rate",
    "previous_score",
)
DEFAULT_OUTPUT = Path(__file__).resolve().parent / "student_learning_data.csv"


def generate_dataset(rows: int = 1500, seed: int = 42, output_path: Path = DEFAULT_OUTPUT) -> Path:
    if rows < 30:
        raise ValueError("rows must be at least 30")

    random = np.random.default_rng(seed)
    attendance = random.beta(8, 2, rows)
    study_hours = random.uniform(1, 30, rows)
    assignment = random.beta(5, 2, rows) * 10
    quiz = random.beta(4, 2, rows) * 10
    completion = random.beta(7, 2, rows)
    previous_score = random.beta(4, 2, rows) * 10

    final_score = (
        0.15 * attendance * 10
        + 0.12 * study_hours / 3
        + 0.22 * assignment
        + 0.20 * quiz
        + 0.13 * completion * 10
        + 0.18 * previous_score
        + 0.25 * (assignment * quiz / 10 - 4)
        + random.normal(0, 0.65, rows)
    ).clip(0, 10)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", newline="", encoding="utf-8") as dataset_file:
        writer = csv.DictWriter(dataset_file, fieldnames=("sample_id", *FEATURES, "final_score", "risk_level"))
        writer.writeheader()
        for index in range(rows):
            score = float(final_score[index])
            risk = "Cao" if score < 5 else "Trung bình" if score < 7 else "Thấp"
            writer.writerow(
                {
                    "sample_id": f"SYN{index + 1:05d}",
                    "attendance_rate": round(float(attendance[index]), 4),
                    "study_hours": round(float(study_hours[index]), 2),
                    "assignment_score": round(float(assignment[index]), 2),
                    "quiz_score": round(float(quiz[index]), 2),
                    "completion_rate": round(float(completion[index]), 4),
                    "previous_score": round(float(previous_score[index]), 2),
                    "final_score": round(score, 2),
                    "risk_level": risk,
                }
            )

    return output_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate a clearly synthetic learning dataset.")
    parser.add_argument("--rows", type=int, default=1500)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    path = generate_dataset(args.rows, args.seed, args.output)
    print(f"Generated {args.rows} synthetic records: {path}")


if __name__ == "__main__":
    main()
