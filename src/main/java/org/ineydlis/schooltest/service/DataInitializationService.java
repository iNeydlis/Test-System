package org.ineydlis.schooltest.service;

import jakarta.annotation.PostConstruct;
import org.ineydlis.schooltest.model.Grade;
import org.ineydlis.schooltest.model.Subject;
import org.ineydlis.schooltest.model.User;
import org.ineydlis.schooltest.model.UserRole;
import org.ineydlis.schooltest.repository.GradeRepository;
import org.ineydlis.schooltest.repository.SubjectRepository;
import org.ineydlis.schooltest.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

@Service
public class DataInitializationService {

    @Autowired
    private GradeRepository gradeRepository;

    @Autowired
    private SubjectRepository subjectRepository;

    private static final List<String> DEFAULT_SUBJECTS = Arrays.asList(
            "Математика", "Русский язык", "Литература", "Физика", "Химия",
            "Биология", "История", "География", "Информатика", "Английский язык",
            "Обществознание", "Физкультура", "ОБЖ", "Технология", "Музыка", "ИЗО"
    );
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;

    @PostConstruct
    @Transactional
    public void initializeData() {
        initializeGrades();
        initializeSubjects();
        initializeAdmin();
    }
    private void initializeAdmin() {
        if (userRepository.count() == 0) {
            User admin = new User();
            admin.setActive(true);
            admin.setUsername("admin");
            admin.setEmail("admin@admin.admin");
            admin.setFullName("Администратор Системы");
            admin.setPassword(passwordEncoder.encode("1"));
            admin.setLastLogin(LocalDateTime.now());
            admin.setRole(UserRole.ADMIN);

            userRepository.save(admin);
        }
    }
    private void initializeGrades() {
        if (gradeRepository.count() == 0) {
            // Классы от 1 до 11
            for (int number = 1; number <= 11; number++) {
                // Литеры от А до Д
                for (char letter = 'А'; letter <= 'Д'; letter++) {
                    Grade grade = new Grade();
                    grade.setNumber(number);
                    grade.setLetter(String.valueOf(letter));
                    grade.setFullName(number + String.valueOf(letter));
                    gradeRepository.save(grade);
                }
            }
        }
    }

    private void initializeSubjects() {
        if (subjectRepository.count() == 0) {
            for (String subjectName : DEFAULT_SUBJECTS) {
                Subject subject = new Subject();
                subject.setName(subjectName);
                subjectRepository.save(subject);
            }
        }
    }
}