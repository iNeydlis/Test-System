package org.ineydlis.schooltest.service;

import org.ineydlis.schooltest.dto.ProfileDto;
import org.ineydlis.schooltest.dto.UserDto;
import org.ineydlis.schooltest.model.User;
import org.ineydlis.schooltest.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ProfileService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private AuthService authService;

    @Value("${app.upload.dir:${user.home}/uploads/profiles}")
    private String uploadDir;

    @Transactional(readOnly = true)
    public UserDto getUserProfile(String token) {
        User user = authService.getCurrentUser(token);

        UserDto.UserDtoBuilder builder = UserDto.builder()
                .id(user.getId())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .role(user.getRole())
                .profileImageUrl(user.getProfileImagePath());

        if (user.getGrade() != null) {
            builder.gradeName(user.getGrade().getFullName());
        }

        if (user.getSubjects() != null && !user.getSubjects().isEmpty()) {
            builder.subjectNames(user.getSubjects().stream()
                    .map(subject -> subject.getName())
                    .collect(Collectors.toSet()));
        }

        if (user.getTeachingGrades() != null && !user.getTeachingGrades().isEmpty()) {
            builder.teachingGradeNames(user.getTeachingGrades().stream()
                    .map(grade -> grade.getFullName())
                    .collect(Collectors.toList()));
        }

        return builder.build();
    }

    @Transactional
    public void updateProfile(String token, ProfileDto profileDto) {
        User user = authService.getCurrentUser(token);

        // Обновление email
        if (profileDto.getEmail() != null && !profileDto.getEmail().isEmpty()) {
            user.setEmail(profileDto.getEmail());
        }

        // Обновление пароля если предоставлен
        if (profileDto.getCurrentPassword() != null && !profileDto.getCurrentPassword().isEmpty() &&
                profileDto.getNewPassword() != null && !profileDto.getNewPassword().isEmpty() &&
                profileDto.getConfirmPassword() != null && !profileDto.getConfirmPassword().isEmpty()) {

            // Проверка текущего пароля
            if (!passwordEncoder.matches(profileDto.getCurrentPassword(), user.getPassword())) {
                throw new RuntimeException("Текущий пароль неверен");
            }

            // Проверка совпадения нового пароля и подтверждения
            if (!profileDto.getNewPassword().equals(profileDto.getConfirmPassword())) {
                throw new RuntimeException("Новый пароль и подтверждение не совпадают");
            }

            // Установка нового пароля
            user.setPassword(passwordEncoder.encode(profileDto.getNewPassword()));
        }

        userRepository.save(user);
    }

    @Transactional
    public String uploadProfileImage(String token, MultipartFile file) throws IOException {
        User user = authService.getCurrentUser(token);

        // Создание директории для загрузки, если её нет
        Path uploadPath = Paths.get(uploadDir);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        // Удаление старого изображения, если оно существует
        if (user.getProfileImagePath() != null && !user.getProfileImagePath().isEmpty()) {
            String oldFilename = user.getProfileImagePath().substring(user.getProfileImagePath().lastIndexOf("/") + 1);
            Path oldFilePath = uploadPath.resolve(oldFilename);
            if (Files.exists(oldFilePath)) {
                Files.delete(oldFilePath);
            }
        }

        // Генерация уникального имени файла
        String filename = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
        Path filePath = uploadPath.resolve(filename);

        // Сохранение файла
        Files.copy(file.getInputStream(), filePath);

        // Обновление пути к изображению в профиле пользователя
        String relativePath = "/api/profile/image/" + filename;
        user.setProfileImagePath(relativePath);
        userRepository.save(user);

        return relativePath;
    }

    public Path getProfileImagePath(String filename) {
        return Paths.get(uploadDir).resolve(filename);
    }
}