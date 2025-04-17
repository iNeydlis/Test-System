package org.ineydlis.schooltest.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.ineydlis.schooltest.model.Test;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TestDto {
    private Long id;
    private String title;
    private String description;
    private String subjectName;
    private Long subjectId;
    private String creatorName;
    private Long creatorId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Integer timeLimit;
    private boolean isActive;
    private Set<String> availableGrades;
    private Integer questionCount;
    private Integer totalPoints;
    private Integer maxScore; // Added for UI consistency
    private Integer maxAttempts;
    private Integer bestScore; // Лучший результат ученика
    private Integer remainingAttempts; // Оставшиеся попытки
    private Double bestScorePercentage; // Процент лучшего результата для правильного сравнения
    private List<QuestionDto> questions;
    private Integer questionsToShow;

    public static TestDto fromEntity(Test test) {
        return TestDto.builder()
                .id(test.getId())
                .title(test.getTitle())
                .description(test.getDescription())
                .subjectName(test.getSubject().getName())
                .subjectId(test.getSubject().getId())
                .creatorName(test.getCreator().getFullName())
                .creatorId(test.getCreator().getId())
                .createdAt(test.getCreatedAt())
                .updatedAt(test.getUpdatedAt())
                .timeLimit(test.getTimeLimit())
                .isActive(test.isActive())
                .availableGrades(test.getAvailableGrades().stream()
                        .map(grade -> grade.getFullName())
                        .collect(Collectors.toSet()))
                .questionCount(test.getQuestions().size())
                .totalPoints(test.getQuestions().stream()
                        .mapToInt(q -> q.getPoints())
                        .sum())
                .maxScore(test.getQuestions().stream() // Same as totalPoints
                        .mapToInt(q -> q.getPoints())
                        .sum())
                .maxAttempts(test.getMaxAttempts())
                .bestScore(null) // Значение по умолчанию или из другого источника
                .remainingAttempts(null) // Значение по умолчанию или из другого источника
                .bestScorePercentage(null) // Будет заполнено в методе getTestsForStudent
                .questionsToShow(test.getQuestionsToShow())
                .build();
    }
}