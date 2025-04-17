package org.ineydlis.schooltest.dto;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * DTO for user statistics in test/grade/subject views
 */
@Data
public class UserStatDto {
    private Long userId;
    private String userName;
    private Long gradeId;
    private String gradeName;
    private int score;
    private int maxScore;
    private int completedTests;
    private LocalDateTime completedAt;
    private Integer attemptNumber;
    private double averagePercentage;
}
