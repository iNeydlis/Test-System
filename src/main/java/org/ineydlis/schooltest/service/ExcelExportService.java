package org.ineydlis.schooltest.service;

import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.ineydlis.schooltest.dto.StatisticViewDto;
import org.ineydlis.schooltest.dto.SubjectStatDto;
import org.ineydlis.schooltest.dto.TestResultDetailsDto;
import org.ineydlis.schooltest.dto.UserStatDto;
import org.ineydlis.schooltest.model.Grade;
import org.ineydlis.schooltest.model.Subject;
import org.ineydlis.schooltest.model.Test;
import org.ineydlis.schooltest.repository.GradeRepository;
import org.ineydlis.schooltest.repository.SubjectRepository;
import org.ineydlis.schooltest.repository.TestRepository;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Date;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ExcelExportService {

    private final StatisticsService statisticsService;
    private final TestRepository testRepository;
    private final GradeRepository gradeRepository;
    private final SubjectRepository subjectRepository;
    private final AuthService authService;

    /**
     * Generate a complete Excel workbook with all available statistics
     */
    public byte[] generateCompleteStatisticsWorkbook(String token) throws IOException {
        // Validate user permissions (only admin and teachers can export full statistics)
        if (!isAuthorizedForFullExport(token)) {
            throw new RuntimeException("У вас нет прав для экспорта полной статистики");
        }

        // Create workbook
        try (Workbook workbook = new XSSFWorkbook()) {
            // Create styles for headers
            CellStyle headerStyle = createHeaderStyle(workbook);

            // Add top students sheet
            addTopStudentsSheet(workbook, headerStyle, token);

            // Add grade statistics sheets
            addGradeStatisticsSheets(workbook, headerStyle, token);

            // Add subject statistics sheets
            addSubjectStatisticsSheets(workbook, headerStyle, token);

            // Add test statistics sheets (limiting to avoid too many sheets)
            addTestStatisticsSheets(workbook, headerStyle, token);

            // Write to byte array
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            workbook.write(outputStream);
            return outputStream.toByteArray();
        }
    }

    /**
     * Generate Excel workbook for a specific student
     */
    public byte[] generateStudentStatisticsWorkbook(String token, Long studentId) throws IOException {
        // Validate user permissions
        if (!statisticsService.canAccessStatistics(token, studentId, StatisticsService.StatisticsAccessType.STUDENT)) {
            throw new RuntimeException("У вас нет прав для просмотра статистики этого ученика");
        }

        try (Workbook workbook = new XSSFWorkbook()) {
            CellStyle headerStyle = createHeaderStyle(workbook);

            // Add student overall performance sheet
            Map<String, StatisticViewDto> performance = statisticsService.getStudentOverallPerformance(token, studentId);

            if (performance.isEmpty()) {
                // Create an empty sheet if no data
                Sheet sheet = workbook.createSheet("Статистика ученика");
                Row headerRow = sheet.createRow(0);
                Cell cell = headerRow.createCell(0);
                cell.setCellValue("Нет данных для отображения");
            } else {
                // Create individual sheets for each subject
                for (Map.Entry<String, StatisticViewDto> entry : performance.entrySet()) {
                    String subjectName = entry.getKey();
                    StatisticViewDto stats = entry.getValue();

                    Sheet sheet = workbook.createSheet(sanitizeSheetName(subjectName));

                    // Add student info
                    Row infoRow = sheet.createRow(0);
                    infoRow.createCell(0).setCellValue("Ученик:");
                    infoRow.createCell(1).setCellValue(stats.getStudentName());

                    Row gradeRow = sheet.createRow(1);
                    gradeRow.createCell(0).setCellValue("Класс:");
                    gradeRow.createCell(1).setCellValue(stats.getGradeName());

                    Row subjectRow = sheet.createRow(2);
                    subjectRow.createCell(0).setCellValue("Предмет:");
                    subjectRow.createCell(1).setCellValue(subjectName);

                    Row averageRow = sheet.createRow(3);
                    averageRow.createCell(0).setCellValue("Средний процент:");
                    averageRow.createCell(1).setCellValue(stats.getAveragePercentage() + "%");

                    // Add tests header
                    Row headerRow = sheet.createRow(5);
                    headerRow.createCell(0).setCellValue("Название теста");
                    headerRow.createCell(1).setCellValue("Баллы");
                    headerRow.createCell(2).setCellValue("Максимум баллов");
                    headerRow.createCell(3).setCellValue("Процент");
                    headerRow.createCell(4).setCellValue("Дата выполнения");
                    headerRow.createCell(5).setCellValue("Номер попытки");

                    for (int i = 0; i <= 5; i++) {
                        headerRow.getCell(i).setCellStyle(headerStyle);
                    }

                    // Add test data
                    List<SubjectStatDto> testStats = stats.getTestStats();
                    for (int i = 0; i < testStats.size(); i++) {
                        SubjectStatDto test = testStats.get(i);
                        Row dataRow = sheet.createRow(6 + i);
                        dataRow.createCell(0).setCellValue(test.getTestTitle());
                        dataRow.createCell(1).setCellValue(test.getScore());
                        dataRow.createCell(2).setCellValue(test.getMaxScore());
                        dataRow.createCell(3).setCellValue(test.getPercentage() + "%");
                        dataRow.createCell(4).setCellValue(test.getCompletedAt());
                        dataRow.createCell(5).setCellValue(test.getAttemptNumber());
                    }

                    // Auto-size columns
                    for (int i = 0; i <= 5; i++) {
                        sheet.autoSizeColumn(i);
                    }
                }
            }

            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            workbook.write(outputStream);
            return outputStream.toByteArray();
        }
    }

    // Helper methods
    private boolean isAuthorizedForFullExport(String token) {
        String cleanToken = token.replace("Bearer ", "");
        var user = authService.getCurrentUser(cleanToken);
        return user.getRole().name().equals("ADMIN") || user.getRole().name().equals("TEACHER");
    }

    private CellStyle createHeaderStyle(Workbook workbook) {
        CellStyle headerStyle = workbook.createCellStyle();
        Font headerFont = workbook.createFont();
        headerFont.setBold(true);
        headerStyle.setFont(headerFont);
        headerStyle.setFillForegroundColor(IndexedColors.LIGHT_CORNFLOWER_BLUE.getIndex());
        headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        headerStyle.setBorderBottom(BorderStyle.THIN);
        headerStyle.setBorderTop(BorderStyle.THIN);
        headerStyle.setBorderLeft(BorderStyle.THIN);
        headerStyle.setBorderRight(BorderStyle.THIN);
        return headerStyle;
    }

    private void addTopStudentsSheet(Workbook workbook, CellStyle headerStyle, String token) {
        StatisticViewDto topStudents = statisticsService.getTopStudentsInSchool(token);

        Sheet sheet = workbook.createSheet("Лучшие ученики");

        // Add title and info
        Row titleRow = sheet.createRow(0);
        Cell titleCell = titleRow.createCell(0);
        titleCell.setCellValue("Лучшие ученики школы");

        Row infoRow = sheet.createRow(1);
        infoRow.createCell(0).setCellValue("Количество учеников:");
        infoRow.createCell(1).setCellValue(topStudents.getTotalStudents());

        Row averageRow = sheet.createRow(2);
        averageRow.createCell(0).setCellValue("Средний процент:");
        averageRow.createCell(1).setCellValue(topStudents.getAverageScore() + "%");

        // Add header row
        Row headerRow = sheet.createRow(4);
        headerRow.createCell(0).setCellValue("Место");
        headerRow.createCell(1).setCellValue("Имя ученика");
        headerRow.createCell(2).setCellValue("Класс");
        headerRow.createCell(3).setCellValue("Баллы");
        headerRow.createCell(4).setCellValue("Максимум баллов");
        headerRow.createCell(5).setCellValue("Средний процент");
        headerRow.createCell(6).setCellValue("Выполнено тестов");

        for (int i = 0; i <= 6; i++) {
            headerRow.getCell(i).setCellStyle(headerStyle);
        }

        // Add data rows
        List<UserStatDto> students = topStudents.getUserStats();
        for (int i = 0; i < students.size(); i++) {
            UserStatDto student = students.get(i);
            Row dataRow = sheet.createRow(5 + i);
            dataRow.createCell(0).setCellValue(i + 1); // Ranking
            dataRow.createCell(1).setCellValue(student.getUserName());
            dataRow.createCell(2).setCellValue(student.getGradeName());
            dataRow.createCell(3).setCellValue(student.getScore());
            dataRow.createCell(4).setCellValue(student.getMaxScore());
            dataRow.createCell(5).setCellValue(student.getAveragePercentage() + "%");
            dataRow.createCell(6).setCellValue(student.getCompletedTests());
        }

        // Auto-size columns
        for (int i = 0; i <= 6; i++) {
            sheet.autoSizeColumn(i);
        }
    }

    private void addGradeStatisticsSheets(Workbook workbook, CellStyle headerStyle, String token) {
        List<Grade> allGrades = gradeRepository.findAll();

        for (Grade grade : allGrades) {
            try {
                StatisticViewDto gradeStats = statisticsService.getGradeStatistics(token, grade.getId());

                if (gradeStats.getUserStats() == null || gradeStats.getUserStats().isEmpty()) {
                    continue; // Skip grades with no data
                }

                Sheet sheet = workbook.createSheet(sanitizeSheetName("Класс " + grade.getFullName()));

                // Add title and info
                Row titleRow = sheet.createRow(0);
                Cell titleCell = titleRow.createCell(0);
                titleCell.setCellValue("Статистика класса: " + grade.getFullName());

                Row infoRow = sheet.createRow(1);
                infoRow.createCell(0).setCellValue("Количество учеников:");
                infoRow.createCell(1).setCellValue(gradeStats.getTotalStudents());

                Row averageRow = sheet.createRow(2);
                averageRow.createCell(0).setCellValue("Средний процент:");
                averageRow.createCell(1).setCellValue(gradeStats.getAverageScore() + "%");

                // Add header row
                Row headerRow = sheet.createRow(4);
                headerRow.createCell(0).setCellValue("Место");
                headerRow.createCell(1).setCellValue("Имя ученика");
                headerRow.createCell(2).setCellValue("Баллы");
                headerRow.createCell(3).setCellValue("Максимум баллов");
                headerRow.createCell(4).setCellValue("Средний процент");
                headerRow.createCell(5).setCellValue("Выполнено тестов");

                for (int i = 0; i <= 5; i++) {
                    headerRow.getCell(i).setCellStyle(headerStyle);
                }

                // Add data rows
                List<UserStatDto> students = gradeStats.getUserStats();
                for (int i = 0; i < students.size(); i++) {
                    UserStatDto student = students.get(i);
                    Row dataRow = sheet.createRow(5 + i);
                    dataRow.createCell(0).setCellValue(i + 1); // Ranking
                    dataRow.createCell(1).setCellValue(student.getUserName());
                    dataRow.createCell(2).setCellValue(student.getScore());
                    dataRow.createCell(3).setCellValue(student.getMaxScore());
                    dataRow.createCell(4).setCellValue(student.getAveragePercentage() + "%");
                    dataRow.createCell(5).setCellValue(student.getCompletedTests());
                }

                // Auto-size columns
                for (int i = 0; i <= 5; i++) {
                    sheet.autoSizeColumn(i);
                }
            } catch (Exception e) {
                // Skip grades we can't access
                continue;
            }
        }
    }

    private void addSubjectStatisticsSheets(Workbook workbook, CellStyle headerStyle, String token) {
        List<Subject> allSubjects = subjectRepository.findAll();

        for (Subject subject : allSubjects) {
            try {
                StatisticViewDto subjectStats = statisticsService.getSubjectStatistics(token, subject.getId());

                if (subjectStats.getUserStats() == null || subjectStats.getUserStats().isEmpty()) {
                    continue; // Skip subjects with no data
                }

                Sheet sheet = workbook.createSheet(sanitizeSheetName("Предмет " + subject.getName()));

                // Add title and info
                Row titleRow = sheet.createRow(0);
                Cell titleCell = titleRow.createCell(0);
                titleCell.setCellValue("Статистика по предмету: " + subject.getName());

                Row infoRow = sheet.createRow(1);
                infoRow.createCell(0).setCellValue("Количество учеников:");
                infoRow.createCell(1).setCellValue(subjectStats.getTotalStudents());

                Row averageRow = sheet.createRow(2);
                averageRow.createCell(0).setCellValue("Средний процент:");
                averageRow.createCell(1).setCellValue(subjectStats.getAverageScore() + "%");

                // Add header row
                Row headerRow = sheet.createRow(4);
                headerRow.createCell(0).setCellValue("Место");
                headerRow.createCell(1).setCellValue("Имя ученика");
                headerRow.createCell(2).setCellValue("Класс");
                headerRow.createCell(3).setCellValue("Баллы");
                headerRow.createCell(4).setCellValue("Максимум баллов");
                headerRow.createCell(5).setCellValue("Средний процент");
                headerRow.createCell(6).setCellValue("Выполнено тестов");

                for (int i = 0; i <= 6; i++) {
                    headerRow.getCell(i).setCellStyle(headerStyle);
                }

                // Add data rows
                List<UserStatDto> students = subjectStats.getUserStats();
                for (int i = 0; i < students.size(); i++) {
                    UserStatDto student = students.get(i);
                    Row dataRow = sheet.createRow(5 + i);
                    dataRow.createCell(0).setCellValue(i + 1); // Ranking
                    dataRow.createCell(1).setCellValue(student.getUserName());
                    dataRow.createCell(2).setCellValue(student.getGradeName());
                    dataRow.createCell(3).setCellValue(student.getScore());
                    dataRow.createCell(4).setCellValue(student.getMaxScore());
                    dataRow.createCell(5).setCellValue(student.getAveragePercentage() + "%");
                    dataRow.createCell(6).setCellValue(student.getCompletedTests());
                }

                // Auto-size columns
                for (int i = 0; i <= 6; i++) {
                    sheet.autoSizeColumn(i);
                }
            } catch (Exception e) {
                // Skip subjects we can't access
                continue;
            }
        }
    }

    private void addTestStatisticsSheets(Workbook workbook, CellStyle headerStyle, String token) {
        // Get most recent 10 tests to avoid too many sheets
        List<Test> recentTests = testRepository.findTop10ByOrderByCreatedAtDesc();

        for (Test test : recentTests) {
            try {
                StatisticViewDto testStats = statisticsService.getTestStatistics(token, test.getId());

                if (testStats.getUserStats() == null || testStats.getUserStats().isEmpty()) {
                    continue; // Skip tests with no data
                }

                Sheet sheet = workbook.createSheet(sanitizeSheetName("Тест " + test.getTitle()));

                // Add title and info
                Row titleRow = sheet.createRow(0);
                Cell titleCell = titleRow.createCell(0);
                titleCell.setCellValue("Статистика теста: " + test.getTitle());

                Row subjectRow = sheet.createRow(1);
                subjectRow.createCell(0).setCellValue("Предмет:");
                subjectRow.createCell(1).setCellValue(test.getSubject().getName());

                Row infoRow = sheet.createRow(2);
                infoRow.createCell(0).setCellValue("Количество учеников:");
                infoRow.createCell(1).setCellValue(testStats.getTotalStudents());

                Row averageRow = sheet.createRow(3);
                averageRow.createCell(0).setCellValue("Средний процент:");
                averageRow.createCell(1).setCellValue(testStats.getAverageScore() + "%");

                // Add header row
                Row headerRow = sheet.createRow(5);
                headerRow.createCell(0).setCellValue("Место");
                headerRow.createCell(1).setCellValue("Имя ученика");
                headerRow.createCell(2).setCellValue("Класс");
                headerRow.createCell(3).setCellValue("Баллы");
                headerRow.createCell(4).setCellValue("Максимум баллов");
                headerRow.createCell(5).setCellValue("Процент");
                headerRow.createCell(6).setCellValue("Дата выполнения");
                headerRow.createCell(7).setCellValue("Номер попытки");

                for (int i = 0; i <= 7; i++) {
                    headerRow.getCell(i).setCellStyle(headerStyle);
                }

                // Add data rows
                List<UserStatDto> students = testStats.getUserStats();
                for (int i = 0; i < students.size(); i++) {
                    UserStatDto student = students.get(i);
                    Row dataRow = sheet.createRow(6 + i);
                    dataRow.createCell(0).setCellValue(i + 1); // Ranking
                    dataRow.createCell(1).setCellValue(student.getUserName());
                    dataRow.createCell(2).setCellValue(student.getGradeName());
                    dataRow.createCell(3).setCellValue(student.getScore());
                    dataRow.createCell(4).setCellValue(student.getMaxScore());
                    dataRow.createCell(5).setCellValue(student.getAveragePercentage() + "%");

                    // Handle date if available
                    if (student.getCompletedAt() != null) {
                        dataRow.createCell(6).setCellValue(student.getCompletedAt());
                    } else {
                        dataRow.createCell(6).setCellValue("Н/Д");
                    }

                    if (student.getCompletedAt() != null) {
                        dataRow.createCell(6).setCellValue(student.getCompletedAt());
                    } else {
                        dataRow.createCell(6).setCellValue("Н/Д");
                    }
                }

                // Auto-size columns
                for (int i = 0; i <= 7; i++) {
                    sheet.autoSizeColumn(i);
                }
            } catch (Exception e) {
                // Skip tests we can't access
                continue;
            }
        }
    }

    private String sanitizeSheetName(String name) {
        // Excel sheet names cannot exceed 31 characters, contain certain characters
        String sanitized = name.replaceAll("[\\/?*\\[\\]:]", "_");
        return sanitized.length() > 31 ? sanitized.substring(0, 31) : sanitized;
    }
}