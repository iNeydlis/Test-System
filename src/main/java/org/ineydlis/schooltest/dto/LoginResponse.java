package org.ineydlis.schooltest.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Set;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class LoginResponse {
    private Long id;
    private String token;
    private String username;
    private String fullName;
    private String role;
    private String email;
    private String gradeName; // Изменено: теперь это полное имя класса
    private Set<String> subjectNames; // Изменено: теперь это имена предметов
    private String profileImageUrl;
    private List<String> teachingGradeNames;
}