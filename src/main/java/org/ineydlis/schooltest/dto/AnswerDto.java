package org.ineydlis.schooltest.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.ineydlis.schooltest.model.Answer;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnswerDto {
    private Long id;
    private String text;
    private Boolean isCorrect;

    public static AnswerDto fromEntity(Answer answer, boolean includeCorrectAnswer) {
        return AnswerDto.builder()
                .id(answer.getId())
                .text(answer.getText())
                .isCorrect(includeCorrectAnswer ? answer.isCorrect() : null)
                .build();
    }
}
