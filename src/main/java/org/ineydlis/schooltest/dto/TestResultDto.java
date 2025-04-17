package org.ineydlis.schooltest.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.ineydlis.schooltest.model.TestResult;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TestResultDto {
    private Long id;
    private Long testId;
    private String testTitle;
    private String subjectName;
    private Long studentId;
    private String studentName;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    private Integer attemptNumber;
    private boolean completed;
    private Integer score;
    private Integer maxScore;  // Maximum possible score for this attempt
    private double percentage; // Added for convenience
    private String message;    // For any system messages

    public static TestResultDto fromEntity(TestResult result) {
        TestResultDtoBuilder builder = TestResultDto.builder()
                .id(result.getId())
                .testId(result.getTest().getId())
                .testTitle(result.getTest().getTitle())
                .subjectName(result.getTest().getSubject().getName())
                .studentId(result.getStudent().getId())
                .studentName(result.getStudent().getFullName())
                .startedAt(result.getStartedAt())
                .completedAt(result.getCompletedAt())
                .attemptNumber(result.getAttemptNumber())
                .completed(result.isCompleted())
                .score(result.getScore())
                .maxScore(result.getMaxScore());

        // Calculate percentage if possible
        if (result.isCompleted() && result.getMaxScore() > 0) {
            double percentage = (double) result.getScore() / result.getMaxScore() * 100;
            builder.percentage(Math.round(percentage * 10) / 10.0); // Round to 1 decimal place
        }

        return builder.build();
    }
}
