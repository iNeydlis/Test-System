package org.ineydlis.schooltest.controller;

import lombok.RequiredArgsConstructor;
import org.ineydlis.schooltest.dto.TeacherSubjectsAndGradesDTO;
import org.ineydlis.schooltest.model.User;
import org.ineydlis.schooltest.repository.UserRepository;
import org.ineydlis.schooltest.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;

@RestController
@RequestMapping("/api/teacher")
@RequiredArgsConstructor
public class TeacherApiController {

    private final AuthService authService;
    private final UserRepository userRepository;

    @GetMapping("/subjects-and-grades")
    public ResponseEntity<TeacherSubjectsAndGradesDTO> getTeacherSubjectsAndGrades(
            @RequestHeader("Authorization") String token) {
        // Get the current authenticated user
        User currentUser = authService.getCurrentUser(token);

        // Fetch the latest user data from the database
        User teacher = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        TeacherSubjectsAndGradesDTO result = new TeacherSubjectsAndGradesDTO();

        // Get the subjects the teacher has access to
        result.setSubjects(new ArrayList<>(teacher.getSubjects()));

        // Get the grades the teacher has access to
        result.setGrades(new ArrayList<>(teacher.getTeachingGrades()));

        return ResponseEntity.ok(result);
    }
}