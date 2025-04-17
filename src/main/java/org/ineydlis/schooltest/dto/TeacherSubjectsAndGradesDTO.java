package org.ineydlis.schooltest.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.ineydlis.schooltest.model.Grade;
import org.ineydlis.schooltest.model.Subject;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TeacherSubjectsAndGradesDTO {
    private List<Subject> subjects;
    private List<Grade> grades;
}