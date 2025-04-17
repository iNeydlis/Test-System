package org.ineydlis.schooltest.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StudentAnswerRequest {
    private Long questionId;
    private String textAnswer; // For text answers
    private List<Long> selectedAnswerIds; // For choice questions
}
