package org.ineydlis.schooltest.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TestCreateRequest {
    private String title;
    private String description;
    private Long subjectId;
    private List<Long> gradeIds;
    private Integer timeLimit;
    private List<QuestionDto> questions;
    private Integer maxAttempts = 1; // Default to 1 attempt
    private Integer questionsToShow;
}
