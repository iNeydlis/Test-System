package org.ineydlis.schooltest.controller;

import org.ineydlis.schooltest.dto.LoginRequest;
import org.ineydlis.schooltest.dto.LoginResponse;
import org.ineydlis.schooltest.service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthService authService;
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, Object>> handleException(RuntimeException ex) {
        Map<String, Object> body = new HashMap<>();
        body.put("message", ex.getMessage());
        body.put("status", 403);
        return ResponseEntity
                .status(403)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body);
    }
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request) {
        LoginResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestHeader("Authorization") String token) {
        authService.logout(token);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/check")
    public ResponseEntity<String> checkAuth(@RequestHeader("Authorization") String token) {
        if (authService.findByToken(token).isPresent()) {
            return ResponseEntity.ok("Авторизация успешна");
        }

        return ResponseEntity.status(403).body("Требуется авторизация");
    }
}