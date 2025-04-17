package org.ineydlis.schooltest.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TestSubmissionRequest {
    private Long testResultId;
    private List<StudentAnswerRequest> answers;
}
