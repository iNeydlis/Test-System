package org.ineydlis.schooltest.controller;

import org.ineydlis.schooltest.dto.UserDto;
import org.ineydlis.schooltest.model.Grade;
import org.ineydlis.schooltest.model.Subject;
import org.ineydlis.schooltest.model.User;
import org.ineydlis.schooltest.model.UserRole;
import org.ineydlis.schooltest.repository.GradeRepository;
import org.ineydlis.schooltest.repository.SubjectRepository;
import org.ineydlis.schooltest.repository.UserRepository;
import org.ineydlis.schooltest.service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private GradeRepository gradeRepository;

    @Autowired
    private SubjectRepository subjectRepository;

    @Autowired
    private AuthService authService;

    @GetMapping("/users")
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userRepository.findAll());
    }

    // Modify AdminController.java - createUser method
    @PostMapping("/users")
    public ResponseEntity<User> createUser(@RequestBody UserDto userDto) {
        User user = new User();
        user.setUsername(userDto.getUsername());
        user.setPassword(authService.encodePassword(userDto.getPassword()));
        user.setFullName(userDto.getFullName());
        user.setEmail(userDto.getEmail());
        user.setRole(userDto.getRole());
        user.setActive(userDto.isActive());

        // Установка класса для ученика
        if (userDto.getRole() == UserRole.STUDENT && userDto.getGradeName() != null) {
            Optional<Grade> grade = gradeRepository.findByFullName(userDto.getGradeName());
            if (grade.isPresent()) {
                user.setGrade(grade.get());
            }
        }

        // Установка предметов для учителя
        if (userDto.getRole() == UserRole.TEACHER) {
            // Assign subjects
            if (userDto.getSubjectNames() != null) {
                Set<Subject> subjects = new HashSet<>();
                for (String subjectName : userDto.getSubjectNames()) {
                    Optional<Subject> subject = subjectRepository.findByName(subjectName);
                    subject.ifPresent(subjects::add);
                }
                user.setSubjects(subjects);
            }

            // Assign grades (classes) that the teacher teaches
            if (userDto.getTeachingGradeNames() != null) {
                Set<Grade> teachingGrades = new HashSet<>();
                for (String gradeName : userDto.getTeachingGradeNames()) {
                    Optional<Grade> grade = gradeRepository.findByFullName(gradeName);
                    grade.ifPresent(teachingGrades::add);
                }
                user.setTeachingGrades(teachingGrades);
            }
        }

        return ResponseEntity.ok(userRepository.save(user));
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<?> updateUser(@PathVariable Long id, @RequestBody UserDto userDto) {
        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        User user = userOpt.get();
        user.setFullName(userDto.getFullName());
        user.setEmail(userDto.getEmail());
        user.setRole(userDto.getRole());
        user.setActive(userDto.isActive());

        // Обновить пароль только если был предоставлен
        if (userDto.getPassword() != null && !userDto.getPassword().isEmpty()) {
            user.setPassword(authService.encodePassword(userDto.getPassword()));
        }

        // Сбросить предыдущие связи
        user.setGrade(null);
        user.setSubjects(new HashSet<>());
        user.setTeachingGrades(new HashSet<>()); // Reset teaching grades

        // Установка класса для ученика
        if (userDto.getRole() == UserRole.STUDENT && userDto.getGradeName() != null) {
            Optional<Grade> grade = gradeRepository.findByFullName(userDto.getGradeName());
            if (grade.isPresent()) {
                user.setGrade(grade.get());
            }
        }

        // Установка предметов и классов для учителя
        if (userDto.getRole() == UserRole.TEACHER) {
            // Assign subjects
            if (userDto.getSubjectNames() != null) {
                Set<Subject> subjects = new HashSet<>();
                for (String subjectName : userDto.getSubjectNames()) {
                    Optional<Subject> subject = subjectRepository.findByName(subjectName);
                    subject.ifPresent(subjects::add);
                }
                user.setSubjects(subjects);
            }

            // Assign grades (classes) that the teacher teaches
            if (userDto.getTeachingGradeNames() != null) {
                Set<Grade> teachingGrades = new HashSet<>();
                for (String gradeName : userDto.getTeachingGradeNames()) {
                    Optional<Grade> grade = gradeRepository.findByFullName(gradeName);
                    grade.ifPresent(teachingGrades::add);
                }
                user.setTeachingGrades(teachingGrades);
            }
        }

        return ResponseEntity.ok(userRepository.save(user));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        if (!userRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        userRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}