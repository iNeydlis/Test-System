package org.ineydlis.schooltest.controller;

import org.ineydlis.schooltest.dto.*;
import org.ineydlis.schooltest.model.User;
import org.ineydlis.schooltest.model.UserRole;
import org.ineydlis.schooltest.service.AuthService;
import org.ineydlis.schooltest.service.TestService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.core.io.Resource;
@RestController
@RequestMapping("/api/tests")
public class TestController {

    @Autowired
    private TestService testService;

    @Autowired
    private AuthService authService;

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


    // Create a new test

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<TestDto> createTest(
            @RequestPart("test") TestCreateRequest request,  // Changed from TestMultipartWrapper wrapper
            @RequestPart(value = "referenceMaterials", required = false) MultipartFile referenceMaterials,
            @RequestHeader("Authorization") String token) {

        User currentUser = authService.getCurrentUser(token);
        if (currentUser.getRole() != UserRole.TEACHER && currentUser.getRole() != UserRole.ADMIN) {
            throw new RuntimeException("У вас нет прав на создание тестов");
        }

        TestDto createdTest = testService.createTest(request, referenceMaterials, currentUser.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(createdTest);
    }

    // Get all tests (for admins)
    @GetMapping
    public ResponseEntity<List<TestDto>> getAllTests(@RequestHeader("Authorization") String token) {
        User currentUser = authService.getCurrentUser(token);

        List<TestDto> tests;

        if (currentUser.getRole() == UserRole.ADMIN) {
            tests = testService.getAllTests();
        } else if (currentUser.getRole() == UserRole.TEACHER) {
            tests = testService.getTestsByTeacher(currentUser.getId());
        } else if (currentUser.getRole() == UserRole.STUDENT) {
            tests = testService.getTestsForStudent(currentUser.getId());
        } else {
            throw new RuntimeException("Неизвестная роль пользователя");
        }

        return ResponseEntity.ok(tests);
    }

    @GetMapping("/{testId}/reference-materials")
    public ResponseEntity<Resource> getReferenceMaterials(
            @PathVariable Long testId,
            @RequestHeader("Authorization") String token) {
        User currentUser = authService.getCurrentUser(token);

        // Get the reference materials resource
        Resource resource = testService.getReferenceMaterialsFile(testId, currentUser.getId());

        // Get the original filename
        String filename = testService.getReferenceMaterialsFilename(testId);

        // Проверка на наличие ресурса
        if (resource == null || !resource.exists()) {
            return ResponseEntity.notFound().build();
        }

        try {
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_PDF) // Явно указываем тип содержимого
                    .contentLength(resource.contentLength()) // Добавляем размер файла
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                    .body(resource);
        } catch (IOException e) {
            // Обработка ошибки
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/result/{resultId}")
    public ResponseEntity<TestResultDetailsDto> getTestResultDetails(
            @PathVariable Long resultId,
            @RequestHeader("Authorization") String token) {
        User currentUser = authService.getCurrentUser(token);

        if (currentUser.getRole() == UserRole.STUDENT) {
            throw new RuntimeException("У вас нет прав на просмотр деталей результата теста");
        }

        // Получаем детали результата теста, включая ответы студента
        TestResultDetailsDto resultDetails = testService.getTestResultDetails(resultId, currentUser.getId());
        return ResponseEntity.ok(resultDetails);
    }
    @DeleteMapping("/{testId}/permanent")
    public ResponseEntity<?> permanentlyDeleteTest(
            @PathVariable Long testId,
            @RequestHeader("Authorization") String token) {
        User currentUser = authService.getCurrentUser(token);

        testService.permanentlyDeleteTest(testId, currentUser.getId());
        return ResponseEntity.ok().build();
    }
    @PostMapping("/{testId}/reactivate")
    public ResponseEntity<TestDto> reactivateTest(
            @PathVariable Long testId,
            @RequestParam(required = false, defaultValue = "false") boolean clearAttempts,
            @RequestHeader("Authorization") String token) {
        User currentUser = authService.getCurrentUser(token);

        if (currentUser.getRole() != UserRole.TEACHER && currentUser.getRole() != UserRole.ADMIN) {
            throw new RuntimeException("У вас нет прав на активацию тестов");
        }

        TestDto reactivatedTest = testService.reactivateTest(testId, currentUser.getId(), clearAttempts);
        return ResponseEntity.ok(reactivatedTest);
    }
    // Get test by ID with questions
    @GetMapping("/{testId}")
    public ResponseEntity<TestDto> getTestById(
            @PathVariable Long testId,
            @RequestParam(required = false, defaultValue = "false") boolean includeAnswers,
            @RequestHeader("Authorization") String token) {
        User currentUser = authService.getCurrentUser(token);

        TestDto test = testService.getTestWithQuestions(testId, currentUser.getId(), includeAnswers);
        return ResponseEntity.ok(test);
    }
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<TestDto> createTestWithoutFile(
            @RequestBody TestCreateRequest request,
            @RequestHeader("Authorization") String token) {
        User currentUser = authService.getCurrentUser(token);
        if (currentUser.getRole() != UserRole.TEACHER && currentUser.getRole() != UserRole.ADMIN) {
            throw new RuntimeException("У вас нет прав на создание тестов");
        }

        TestDto createdTest = testService.createTest(request, null, currentUser.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(createdTest);
    }

    @PutMapping(value = "/{testId}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<TestDto> updateTestWithoutFile(
            @PathVariable Long testId,
            @RequestBody TestCreateRequest request,
            @RequestParam(value = "removeReferenceMaterials", required = false, defaultValue = "false") boolean removeReferenceMaterials,
            @RequestHeader("Authorization") String token) {
        User currentUser = authService.getCurrentUser(token);

        if (currentUser.getRole() != UserRole.TEACHER && currentUser.getRole() != UserRole.ADMIN) {
            throw new RuntimeException("У вас нет прав на редактирование тестов");
        }

        TestDto updatedTest = testService.updateTest(testId, request, null, removeReferenceMaterials, currentUser.getId());
        return ResponseEntity.ok(updatedTest);
    }
    // Update a test
    @PutMapping(value = "/{testId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<TestDto> updateTest(
            @PathVariable Long testId,
            @RequestPart("test") TestCreateRequest request,
            @RequestPart(value = "referenceMaterials", required = false) MultipartFile referenceMaterials,
            @RequestParam(value = "removeReferenceMaterials", required = false, defaultValue = "false") boolean removeReferenceMaterials,
            @RequestHeader("Authorization") String token) {
        User currentUser = authService.getCurrentUser(token);

        if (currentUser.getRole() != UserRole.TEACHER && currentUser.getRole() != UserRole.ADMIN) {
            throw new RuntimeException("У вас нет прав на редактирование тестов");
        }

        TestDto updatedTest = testService.updateTest(testId, request, referenceMaterials, removeReferenceMaterials, currentUser.getId());
        return ResponseEntity.ok(updatedTest);
    }

    // Delete a test
    @DeleteMapping("/{testId}")
    public ResponseEntity<Void> deleteTest(
            @PathVariable Long testId,
            @RequestHeader("Authorization") String token) {
        User currentUser = authService.getCurrentUser(token);

        if (currentUser.getRole() != UserRole.TEACHER && currentUser.getRole() != UserRole.ADMIN) {
            throw new RuntimeException("У вас нет прав на удаление тестов");
        }

        testService.deleteTest(testId, currentUser.getId());
        return ResponseEntity.noContent().build();
    }

    // Get questions for a test (for students taking the test)
    @GetMapping("/{testId}/questions")
    public ResponseEntity<List<QuestionDto>> getTestQuestions(
            @PathVariable Long testId,
            @RequestParam Long testResultId,
            @RequestHeader("Authorization") String token) {
        User currentUser = authService.getCurrentUser(token);

        if (currentUser.getRole() != UserRole.STUDENT) {
            throw new RuntimeException("Только ученики могут получать вопросы для прохождения теста");
        }

        List<QuestionDto> questions = testService.getTestQuestions(
                testId, testResultId, currentUser.getId());
        return ResponseEntity.ok(questions);
    }
    @GetMapping("/{testId}/in-progress")
    public ResponseEntity<TestResultDto> getInProgressTest(
            @PathVariable Long testId,
            @RequestHeader("Authorization") String token) {
        User currentUser = authService.getCurrentUser(token);

        if (currentUser.getRole() != UserRole.STUDENT) {
            throw new RuntimeException("Только ученики могут получить информацию о незавершенном тесте");
        }

        TestResultDto testResult = testService.getInProgressTest(testId, currentUser.getId());
        return ResponseEntity.ok(testResult);
    }

    // Start a test (for students)
    @PostMapping("/{testId}/start")
    public ResponseEntity<TestResultDto> startTest(
            @PathVariable Long testId,
            @RequestHeader("Authorization") String token) {
        User currentUser = authService.getCurrentUser(token);

        if (currentUser.getRole() != UserRole.STUDENT) {
            throw new RuntimeException("Только ученики могут начинать тесты");
        }

        TestResultDto testResult = testService.startTest(testId, currentUser.getId());
        return ResponseEntity.ok(testResult);
    }

    // Submit answers for a test
    @PostMapping("/submit")
    public ResponseEntity<TestResultDto> submitTest(
            @RequestBody TestSubmissionRequest request,
            @RequestHeader("Authorization") String token) {
        User currentUser = authService.getCurrentUser(token);

        if (currentUser.getRole() != UserRole.STUDENT) {
            throw new RuntimeException("Только ученики могут отправлять ответы на тест");
        }

        TestResultDto result = testService.submitTest(request, currentUser.getId());
        return ResponseEntity.ok(result);
    }

    // Get test results for a student
    @GetMapping("/results")
    public ResponseEntity<List<TestResultDto>> getStudentResults(
            @RequestHeader("Authorization") String token) {
        User currentUser = authService.getCurrentUser(token);

        if (currentUser.getRole() != UserRole.STUDENT) {
            throw new RuntimeException("Это API предназначено только для учеников");
        }

        List<TestResultDto> results = testService.getStudentResults(currentUser.getId());
        return ResponseEntity.ok(results);
    }
    // Get specific test result by ID
    @GetMapping("/results/{resultId}")
    public ResponseEntity<TestResultDto> getTestResultById(
            @PathVariable Long resultId,
            @RequestHeader("Authorization") String token) {
        User currentUser = authService.getCurrentUser(token);

        TestResultDto result = testService.getTestResultById(resultId, currentUser.getId());
        return ResponseEntity.ok(result);
    }
    // Get test results for a specific test (for teachers and admins)
    @GetMapping("/{testId}/results")
    public ResponseEntity<List<TestResultDto>> getTestResults(
            @PathVariable Long testId,
            @RequestHeader("Authorization") String token) {
        User currentUser = authService.getCurrentUser(token);

        if (currentUser.getRole() != UserRole.TEACHER && currentUser.getRole() != UserRole.ADMIN) {
            throw new RuntimeException("У вас нет прав на просмотр результатов теста");
        }

        List<TestResultDto> results = testService.getTestResults(testId, currentUser.getId());
        return ResponseEntity.ok(results);
    }
}

