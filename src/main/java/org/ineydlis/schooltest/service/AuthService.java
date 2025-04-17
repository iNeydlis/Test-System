package org.ineydlis.schooltest.service;

import org.ineydlis.schooltest.dto.LoginRequest;
import org.ineydlis.schooltest.dto.LoginResponse;
import org.ineydlis.schooltest.dto.UserDto;
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
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Transactional
    public LoginResponse login(LoginRequest request) {
        Optional<User> userOpt = userRepository.findByUsername(request.getUsername());

        if (userOpt.isEmpty() || !passwordEncoder.matches(request.getPassword(), userOpt.get().getPassword())) {
            throw new RuntimeException("Неверное имя пользователя или пароль");
        }

        User user = userOpt.get();

        // Генерируем уникальный токен
        String token = UUID.randomUUID().toString();
        user.setToken(token);
        user.setLastLogin(LocalDateTime.now());
        userRepository.save(user);

        // Создаем базовый ответ
        LoginResponse.LoginResponseBuilder responseBuilder = LoginResponse.builder()
                .id(user.getId())
                .token(token)
                .username(user.getUsername())
                .fullName(user.getFullName())
                .role(user.getRole().name())
                .profileImageUrl(user.getProfileImagePath() != null ? user.getProfileImagePath() : "")
                .email(user.getEmail());

        // Добавляем информацию в зависимости от роли пользователя
        if (user.getRole() == UserRole.STUDENT) {
            // Для ученика добавляем класс
            if (user.getGrade() != null) {
                responseBuilder.gradeName(user.getGrade().getFullName());
            }
        } else if (user.getRole() == UserRole.TEACHER) {
            // Для учителя добавляем преподаваемые предметы
            if (user.getSubjects() != null && !user.getSubjects().isEmpty()) {
                Set<String> subjectNames = user.getSubjects().stream()
                        .map(Subject::getName)
                        .collect(Collectors.toSet());
                responseBuilder.subjectNames(subjectNames);
            }
        }
        // Для ADMIN дополнительная информация не требуется

        return responseBuilder.build();
    }

    public Optional<User> findByToken(String token) {
        return userRepository.findByToken(token);
    }

    @Transactional
    public void logout(String token) {
        Optional<User> userOpt = userRepository.findByToken(token);

        if (userOpt.isPresent()) {
            User user = userOpt.get();
            user.setToken(null);
            userRepository.save(user);
        }
    }

    public User getCurrentUser(String token) {
        Optional<User> userOpt = findByToken(token.replace("Bearer ", ""));
        if (userOpt.isEmpty()) {
            throw new RuntimeException("Требуется авторизация");
        }
        return userOpt.get();
    }

    public String encodePassword(String rawPassword) {
        return passwordEncoder.encode(rawPassword);
    }
}