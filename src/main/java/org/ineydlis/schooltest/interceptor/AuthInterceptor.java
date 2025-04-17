package org.ineydlis.schooltest.interceptor;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.ineydlis.schooltest.model.User;
import org.ineydlis.schooltest.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.HashMap;
import java.util.Map;

@Component
public class AuthInterceptor implements HandlerInterceptor {

   private AuthService authService;
   private ObjectMapper objectMapper;

    @Autowired
    public AuthInterceptor(AuthService authService, ObjectMapper objectMapper) {
        this.authService = authService;
        this.objectMapper = objectMapper;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        // Пропускаем запросы на авторизацию
        if (request.getRequestURI().startsWith("/api/auth")) {
            return true;
        }

        // Получаем токен из заголовка
        String token = request.getHeader("Authorization");

        if (token != null && !token.isEmpty()) {
            // Находим пользователя по токену
            User user = authService.findByToken(token).orElse(null);

            if (user != null && user.isActive()) {
                // Устанавливаем атрибут пользователя, чтобы получить доступ в контроллере
                request.setAttribute("user", user);
                return true;
            }
        }

        // Отправляем сообщение о необходимости авторизации
        response.setContentType("application/json");
        response.setStatus(403);

        Map<String, Object> error = new HashMap<>();
        error.put("status", 403);
        error.put("message", "Требуется авторизация");

        response.getWriter().write(objectMapper.writeValueAsString(error));
        return false;
    }
}