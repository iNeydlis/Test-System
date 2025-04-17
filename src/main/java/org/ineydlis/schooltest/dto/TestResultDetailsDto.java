package org.ineydlis.schooltest.dto;

import lombok.Getter;
import lombok.Setter;
import org.ineydlis.schooltest.model.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.ArrayList;
import java.util.stream.Collectors;

@Getter
@Setter
public class TestResultDetailsDto {
    // Getters and setters
    private Long id;
    private Long testId;
    private String testTitle;
    private Long studentId;
    private String studentName;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    private boolean completed;
    private int score;
    private int maxScore;
    private int attemptNumber;
    private List<StudentAnswerDto> studentAnswers = new ArrayList<>();

    private Long gradeId;
    private String gradeName;


    // Дополнительная информация для статистики
    private int correctAnswersCount;
    private int totalQuestionsCount;
    private double percentageCorrect;

    // Factory method to create from entity
    public static TestResultDetailsDto fromEntity(TestResult testResult) {
        TestResultDetailsDto dto = new TestResultDetailsDto();

        dto.setId(testResult.getId());
        dto.setTestId(testResult.getTest().getId());
        dto.setTestTitle(testResult.getTest().getTitle());
        dto.setStudentId(testResult.getStudent().getId());
        dto.setStudentName(testResult.getStudent().getFullName());
        dto.setStartedAt(testResult.getStartedAt());
        dto.setCompletedAt(testResult.getCompletedAt());
        dto.setCompleted(testResult.isCompleted());
        dto.setScore(testResult.getScore());
        dto.setMaxScore(testResult.getMaxScore());
        dto.setAttemptNumber(testResult.getAttemptNumber());

        // Преобразуем студенческие ответы
        List<StudentAnswerDto> answerDtos = testResult.getStudentAnswers().stream()
                .map(StudentAnswerDto::fromEntity)
                .collect(Collectors.toList());
        dto.setStudentAnswers(answerDtos);

        // Рассчитываем статистику
        int correctCount = (int) testResult.getStudentAnswers().stream()
                .filter(StudentAnswer::isCorrect)
                .count();
        dto.setCorrectAnswersCount(correctCount);
        dto.setTotalQuestionsCount(testResult.getStudentAnswers().size());

        if (dto.getTotalQuestionsCount() > 0) {
            dto.setPercentageCorrect(Math.round(((double) dto.getScore() / dto.getMaxScore()) * 100 * 100.0) / 100.0);
        }

        List<Long> selectedQuestionIds = testResult.getSelectedQuestionIds();
        boolean hasSelectedQuestions = selectedQuestionIds != null && !selectedQuestionIds.isEmpty();


        List<StudentAnswerDto> studentAnswers = testResult.getStudentAnswers().stream()
                .filter(answer -> !hasSelectedQuestions || selectedQuestionIds.contains(answer.getQuestion().getId()))
                .map(StudentAnswerDto::fromEntity)
                .collect(Collectors.toList());

        dto.setStudentAnswers(studentAnswers);
        return dto;
    }
}