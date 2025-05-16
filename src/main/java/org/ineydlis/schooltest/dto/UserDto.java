package org.ineydlis.schooltest.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.ineydlis.schooltest.model.UserRole;

import java.util.List;
import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDto {
    private Long id;
    private String username;
    private String password; // Для создания, не возвращается в ответе
    private String fullName;
    private String email;
    private UserRole role;
    private String gradeName; // Изменено: теперь это имя класса (например, "1А")
    private Set<String> subjectNames; // Изменено: теперь это набор имён предметов
    private String profileImageUrl;
    private boolean active;
    private List<String> teachingGradeNames;
}
