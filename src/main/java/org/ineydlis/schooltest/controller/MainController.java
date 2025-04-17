package org.ineydlis.schooltest.controller;

import org.ineydlis.schooltest.model.User;
import org.ineydlis.schooltest.model.UserRole;
import org.ineydlis.schooltest.service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Controller
public class MainController {

    @Autowired
    private AuthService authService;

    @GetMapping("/")
    public String index() {
        return "redirect:/app";
    }

    @GetMapping("/app")
    public String app() {
        return "index"; // Will serve your frontend SPA
    }

    @GetMapping("/api/user/dashboard")
    public ResponseEntity<Map<String, Object>> getDashboard(
            @RequestHeader("Authorization") String token) {

        Optional<User> userOpt = authService.findByToken(token.replace("Bearer ", ""));
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(403).body(Map.of(
                    "status", 403,
                    "message", "Требуется авторизация"
            ));
        }

        User user = userOpt.get();
        Map<String, Object> response = new HashMap<>();
        response.put("username", user.getUsername());
        response.put("fullName", user.getFullName());
        response.put("role", user.getRole().name());

        // Add role-specific dashboard data
        if (user.getRole() == UserRole.STUDENT) {
            response.put("dashboardType", "student");
        } else if (user.getRole() == UserRole.TEACHER) {
            response.put("dashboardType", "teacher");
        } else if (user.getRole() == UserRole.ADMIN) {
            response.put("dashboardType", "admin");
        }

        return ResponseEntity.ok(response);
    }
}
