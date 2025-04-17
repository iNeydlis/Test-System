package org.ineydlis.schooltest.dto;

import lombok.Getter;
import lombok.Setter;
import org.ineydlis.schooltest.model.*;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

@Setter
@Getter
public class StudentAnswerDto {
    // Getters and setters
    private Long id;
    private Long questionId;
    private String questionText;
    private QuestionType questionType;
    private String textAnswer;
    private Set<AnswerDto> selectedAnswers = new HashSet<>();
    private Set<AnswerDto> correctAnswers = new HashSet<>();
    private boolean correct;
    private int earnedPoints;
    private int maxPoints;

    // Factory method to create from entity
    public static StudentAnswerDto fromEntity(StudentAnswer studentAnswer) {
        StudentAnswerDto dto = new StudentAnswerDto();

        dto.setId(studentAnswer.getId());
        dto.setQuestionId(studentAnswer.getQuestion().getId());
        dto.setQuestionText(studentAnswer.getQuestion().getText());
        dto.setQuestionType(studentAnswer.getQuestion().getType());
        dto.setTextAnswer(studentAnswer.getTextAnswer());
        dto.setCorrect(studentAnswer.isCorrect());
        dto.setEarnedPoints(studentAnswer.getEarnedPoints());
        dto.setMaxPoints(studentAnswer.getQuestion().getPoints());

        // Устанавливаем выбранные ответы
        if (studentAnswer.getSelectedAnswers() != null) {
            Set<AnswerDto> selectedAnswerDtos = studentAnswer.getSelectedAnswers().stream()
                    .map(answer -> {
                        AnswerDto answerDto = new AnswerDto();
                        answerDto.setId(answer.getId());
                        answerDto.setText(answer.getText());
                        answerDto.setIsCorrect(answer.isCorrect());
                        return answerDto;
                    })
                    .collect(Collectors.toSet());
            dto.setSelectedAnswers(selectedAnswerDtos);
        }

        // Устанавливаем правильные ответы
        Set<AnswerDto> correctAnswerDtos = studentAnswer.getQuestion().getAnswers().stream()
                .filter(Answer::isCorrect)
                .map(answer -> {
                    AnswerDto answerDto = new AnswerDto();
                    answerDto.setId(answer.getId());
                    answerDto.setText(answer.getText());
                    answerDto.setIsCorrect(true);
                    return answerDto;
                })
                .collect(Collectors.toSet());
        dto.setCorrectAnswers(correctAnswerDtos);

        return dto;
    }
}