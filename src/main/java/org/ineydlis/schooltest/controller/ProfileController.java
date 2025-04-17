package org.ineydlis.schooltest.controller;

import org.ineydlis.schooltest.dto.ProfileDto;
import org.ineydlis.schooltest.dto.UserDto;
import org.ineydlis.schooltest.service.ProfileService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    @Autowired
    private ProfileService profileService;

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, Object>> handleException(RuntimeException ex) {
        Map<String, Object> body = new HashMap<>();
        body.put("message", ex.getMessage());
        body.put("status", 400);
        return ResponseEntity
                .status(400)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body);
    }

    @GetMapping
    public ResponseEntity<UserDto> getProfile(@RequestHeader("Authorization") String token) {
        UserDto profile = profileService.getUserProfile(token);
        return ResponseEntity.ok(profile);
    }

    @PutMapping
    public ResponseEntity<Map<String, String>> updateProfile(
            @RequestHeader("Authorization") String token,
            @RequestBody ProfileDto profileDto) {

        profileService.updateProfile(token, profileDto);

        Map<String, String> response = new HashMap<>();
        response.put("message", "Профиль успешно обновлен");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/image")
    public ResponseEntity<Map<String, String>> uploadProfileImage(
            @RequestHeader("Authorization") String token,
            @RequestParam("file") MultipartFile file) {

        try {
            String imagePath = profileService.uploadProfileImage(token, file);

            Map<String, String> response = new HashMap<>();
            response.put("message", "Изображение профиля успешно загружено");
            response.put("imagePath", imagePath);
            return ResponseEntity.ok(response);
        } catch (IOException e) {
            throw new RuntimeException("Ошибка при загрузке изображения: " + e.getMessage());
        }
    }

    @GetMapping("/image/{filename:.+}")
    public ResponseEntity<Resource> getProfileImage(@PathVariable String filename) {
        try {
            Path filePath = profileService.getProfileImagePath(filename);
            Resource resource = new UrlResource(filePath.toUri());

            if (resource.exists() || resource.isReadable()) {
                return ResponseEntity.ok()
                        .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                        .contentType(MediaType.IMAGE_JPEG) // Можно добавить определение типа по расширению
                        .body(resource);
            } else {
                throw new RuntimeException("Не удалось прочитать файл");
            }
        } catch (MalformedURLException e) {
            throw new RuntimeException("Ошибка: " + e.getMessage());
        }
    }
}