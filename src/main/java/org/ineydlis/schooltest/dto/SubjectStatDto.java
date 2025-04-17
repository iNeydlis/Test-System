package org.ineydlis.schooltest.dto;

import lombok.Data;
import java.time.LocalDateTime;

/**
 * DTO for test statistics in subject views
 */
@Data
public class SubjectStatDto {
    private Long testId;
    private String testTitle;
    private int score;
    private int maxScore;
    private LocalDateTime completedAt;
    private int attemptNumber;
    private double percentage;
}