package org.ineydlis.schooltest.dto;

import lombok.Data;

import java.util.HashMap;
import java.util.Map;

@Data
public class StatisticsDto {
    // Общие показатели
    private int totalTestsCompleted;
    private double averageScore;
    private int maxScore;
    private int minScore;

    // Распределение оценок
    private Map<String, Long> scoreDistribution = new HashMap<>();
}