package org.ineydlis.schooltest.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * DTO for displaying test statistics per student, grade, or subject
 */
@Data
public class StatisticViewDto {
    // View metadata
    private String viewTitle;

    // Student info
    private Long studentId;
    private String studentName;

    // Grade info
    private Long gradeId;
    private String gradeName;

    // Subject info
    private Long subjectId;
    private String subjectName;

    // Test info
    private Long testId;
    private String testTitle;

    // Statistics
    private int totalStudents;
    private int completedTests;
    private double averageScore;
    private double averagePercentage;

    // Lists for detailed views
    private List<UserStatDto> userStats = new ArrayList<>();
    private List<SubjectStatDto> testStats = new ArrayList<>();
}

