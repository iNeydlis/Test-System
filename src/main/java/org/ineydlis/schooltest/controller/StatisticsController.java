package org.ineydlis.schooltest.controller;

import lombok.RequiredArgsConstructor;
import org.ineydlis.schooltest.dto.StatisticViewDto;
import org.ineydlis.schooltest.dto.TestResultDetailsDto;
import org.ineydlis.schooltest.service.StatisticsService;
import org.ineydlis.schooltest.service.ExcelExportService;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/statistics")
@RequiredArgsConstructor
public class StatisticsController {

    private final StatisticsService statisticsService;
    private final ExcelExportService excelExportService;

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, Object>> handleException(RuntimeException ex) {
        System.err.println("Обрабатывается исключение в контроллере: " + ex.getMessage());
        ex.printStackTrace();

        Map<String, Object> body = new HashMap<>();
        body.put("message", ex.getMessage());
        body.put("status", 403);
        return ResponseEntity
                .status(403)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body);
    }

    /**
     * Get detailed information about a specific test result
     */
    @GetMapping("/test-result/{testResultId}")
    public ResponseEntity<TestResultDetailsDto> getTestResultDetails(
            @RequestHeader("Authorization") String token,
            @PathVariable Long testResultId) {
        return ResponseEntity.ok(statisticsService.getTestResultDetails(token, testResultId));
    }

    /**
     * Get statistics for a specific test (all students' best attempts)
     */
    @GetMapping("/test/{testId}")
    public ResponseEntity<StatisticViewDto> getTestStatistics(
            @RequestHeader("Authorization") String token,
            @PathVariable Long testId) {
        return ResponseEntity.ok(statisticsService.getTestStatistics(token, testId));
    }

    /**
     * Get statistics for a specific grade (all students' best test attempts)
     */
    @GetMapping("/grade/{gradeId}")
    public ResponseEntity<StatisticViewDto> getGradeStatistics(
            @RequestHeader("Authorization") String token,
            @PathVariable Long gradeId) {
        return ResponseEntity.ok(statisticsService.getGradeStatistics(token, gradeId));
    }

    /**
     * Get statistics for a specific subject (all students' best test attempts)
     */
    @GetMapping("/subject/{subjectId}")
    public ResponseEntity<StatisticViewDto> getSubjectStatistics(
            @RequestHeader("Authorization") String token,
            @PathVariable Long subjectId) {
        return ResponseEntity.ok(statisticsService.getSubjectStatistics(token, subjectId));
    }

    /**
     * Get student's statistics for a specific subject
     */
    @GetMapping("/student/{studentId}/subject/{subjectId}")
    public ResponseEntity<StatisticViewDto> getStudentSubjectStatistics(
            @RequestHeader("Authorization") String token,
            @PathVariable Long studentId,
            @PathVariable Long subjectId) {
        return ResponseEntity.ok(statisticsService.getStudentSubjectStatistics(token, studentId, subjectId));
    }

    /**
     * Get student's overall performance across all subjects
     */
    @GetMapping("/student/{studentId}/performance")
    public ResponseEntity<Map<String, StatisticViewDto>> getStudentOverallPerformance(
            @RequestHeader("Authorization") String token,
            @PathVariable Long studentId) {
        return ResponseEntity.ok(statisticsService.getStudentOverallPerformance(token, studentId));
    }

    /**
     * Get top students in school across all subjects
     */
    @GetMapping("/school/top-students")
    public ResponseEntity<StatisticViewDto> getTopStudentsInSchool(
            @RequestHeader("Authorization") String token) {
        return ResponseEntity.ok(statisticsService.getTopStudentsInSchool(token));
    }
    /**
     * Export all statistics to Excel file
     */
    @GetMapping("/export/excel")
    public ResponseEntity<Resource> exportAllStatisticsToExcel(
            @RequestHeader("Authorization") String token) {
        try {
            byte[] excelFile = excelExportService.generateCompleteStatisticsWorkbook(token);

            ByteArrayResource resource = new ByteArrayResource(excelFile);

            String currentDate = new SimpleDateFormat("yyyy-MM-dd").format(new Date());
            String filename = URLEncoder.encode("Статистика_" + currentDate + ".xlsx",
                    StandardCharsets.UTF_8.toString()).replace("+", "%20");

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename*=UTF-8''" + filename)
                    .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .contentLength(excelFile.length)
                    .body(resource);

        } catch (IOException e) {
            throw new RuntimeException("Ошибка при создании Excel файла: " + e.getMessage());
        }
    }

    /**
     * Export student statistics to Excel file
     */
    @GetMapping("/export/student/{studentId}")
    public ResponseEntity<Resource> exportStudentStatisticsToExcel(
            @RequestHeader("Authorization") String token,
            @PathVariable Long studentId) {
        try {
            byte[] excelFile = excelExportService.generateStudentStatisticsWorkbook(token, studentId);

            ByteArrayResource resource = new ByteArrayResource(excelFile);

            String currentDate = new SimpleDateFormat("yyyy-MM-dd").format(new Date());
            String filename = URLEncoder.encode("Статистика_ученика_" + studentId + "_" + currentDate + ".xlsx",
                    StandardCharsets.UTF_8.toString()).replace("+", "%20");

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename*=UTF-8''" + filename)
                    .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .contentLength(excelFile.length)
                    .body(resource);

        } catch (IOException e) {
            throw new RuntimeException("Ошибка при создании Excel файла: " + e.getMessage());
        }
    }
}