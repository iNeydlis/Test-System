package org.ineydlis.schooltest.service;

import lombok.RequiredArgsConstructor;
import org.ineydlis.schooltest.dto.StatisticViewDto;
import org.ineydlis.schooltest.dto.TestResultDetailsDto;
import org.ineydlis.schooltest.dto.UserStatDto;
import org.ineydlis.schooltest.dto.SubjectStatDto;
import org.ineydlis.schooltest.model.*;
import org.ineydlis.schooltest.repository.*;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StatisticsService {

    private final TestResultRepository testResultRepository;
    private final UserRepository userRepository;
    private final SubjectRepository subjectRepository;
    private final GradeRepository gradeRepository;
    private final TestRepository testRepository;
    private final AuthService authService;

    /**
     * Check if user has access to view statistics
     */
    public boolean canAccessStatistics(String token, Long entityId, StatisticsAccessType accessType) {
        User currentUser = authService.getCurrentUser(token.replace("Bearer ", ""));

        switch (accessType) {
            case TEST_RESULT:
                return canAccessTestStatistics(currentUser, entityId);
            case STUDENT:
                return canAccessStudentStatistics(currentUser, entityId);
            case GRADE:
                return canAccessGradeStatistics(currentUser, entityId);
            case SUBJECT:
                return canAccessSubjectStatistics(currentUser, entityId);
            default:
                return false;
        }
    }

    private boolean canAccessTestStatistics(User currentUser, Long testResultId) {
        // Admin can access any test result
        if (currentUser.getRole() == UserRole.ADMIN) {
            return true;
        }

        TestResult testResult = testResultRepository.findById(testResultId)
                .orElseThrow(() -> new RuntimeException("Test result not found"));

        // Students can only access their own test results
        if (currentUser.getRole() == UserRole.STUDENT) {
            return currentUser.getId().equals(testResult.getStudent().getId());
        }

        // Teachers can access test results for their subjects
        if (currentUser.getRole() == UserRole.TEACHER) {
            return currentUser.getSubjects().contains(testResult.getTest().getSubject());
        }

        return false;
    }

    private boolean canAccessStudentStatistics(User currentUser, Long studentId) {
        System.out.println("Проверка доступа к статистике студента");
        System.out.println("Текущий пользователь ID: " + currentUser.getId() + ", Имя: " + currentUser.getFullName() + ", Роль: " + currentUser.getRole());
        System.out.println("Запрашиваемый студент ID: " + studentId);

        // Admin can access any student's statistics
        if (currentUser.getRole() == UserRole.ADMIN) {
            System.out.println("Доступ разрешен (администратор)");
            return true;
        }

        // Students can only access their own statistics
        if (currentUser.getRole() == UserRole.STUDENT) {
            boolean hasAccess = currentUser.getId().equals(studentId);
            System.out.println("Студент запрашивает: " + (hasAccess ? "свою статистику (доступ разрешен)" : "чужую статистику (доступ запрещен)"));
            return hasAccess;
        }

        // Teachers can access statistics for students in their classes/subjects
        if (currentUser.getRole() == UserRole.TEACHER) {
            User student = userRepository.findById(studentId)
                    .orElseThrow(() -> new RuntimeException("Student not found"));

            // Check if student's grade is assigned to teacher's subjects
            Set<Subject> teacherSubjects = currentUser.getSubjects();
            return teacherSubjects.stream()
                    .anyMatch(subject -> {
                        List<TestResult> results = testResultRepository.findByStudentIdAndTestSubjectId(studentId, subject.getId());
                        return !results.isEmpty();
                    });
        }

        return false;
    }

    private boolean canAccessGradeStatistics(User currentUser, Long gradeId) {
        // Admin can access any grade statistics
        if (currentUser.getRole() == UserRole.ADMIN) {
            return true;
        }

        // Students can access their own grade statistics
        if (currentUser.getRole() == UserRole.STUDENT) {
            return currentUser.getGrade() != null && currentUser.getGrade().getId().equals(gradeId);
        }

        // Teachers can access statistics for grades they teach
        if (currentUser.getRole() == UserRole.TEACHER) {
            // Check if teacher teaches any subject for this grade
            return testRepository.findBySubjectInAndGradeId(
                    currentUser.getSubjects(), gradeId).size() > 0;
        }

        return false;
    }

    private boolean canAccessSubjectStatistics(User currentUser, Long subjectId) {
        // Admin can access any subject statistics
        if (currentUser.getRole() == UserRole.ADMIN) {
            return true;
        }

        // Students can access subject statistics for subjects they take
        if (currentUser.getRole() == UserRole.STUDENT) {
            List<TestResult> results = testResultRepository.findByStudentIdAndTestSubjectId(
                    currentUser.getId(), subjectId);
            return !results.isEmpty();
        }

        // Teachers can access statistics for subjects they teach
        if (currentUser.getRole() == UserRole.TEACHER) {
            return currentUser.getSubjects().stream()
                    .anyMatch(subject -> subject.getId().equals(subjectId));
        }

        return false;
    }

    /**
     * Get detailed statistics for a specific test result
     */
    public TestResultDetailsDto getTestResultDetails(String token, Long testResultId) {
        User currentUser = authService.getCurrentUser(token.replace("Bearer ", ""));

        if (!canAccessStatistics(token, testResultId, StatisticsAccessType.TEST_RESULT)) {
            throw new RuntimeException("You don't have permission to view this test result");
        }

        TestResult testResult = testResultRepository.findById(testResultId)
                .orElseThrow(() -> new RuntimeException("Test result not found"));

        Test test = testResult.getTest();
        User student = testResult.getStudent();
        Grade grade = student.getGrade();

        TestResultDetailsDto detailsDto = new TestResultDetailsDto();
        detailsDto.setTestId(test.getId());
        detailsDto.setTestTitle(test.getTitle());
        detailsDto.setStudentId(student.getId());
        detailsDto.setStudentName(student.getFullName());
        detailsDto.setGradeId(grade.getId());
        detailsDto.setGradeName(grade.getFullName());
        detailsDto.setScore(testResult.getScore());
        detailsDto.setMaxScore(testResult.getMaxScore());
        detailsDto.setCompletedAt(testResult.getCompletedAt());
        detailsDto.setAttemptNumber(testResult.getAttemptNumber());

        return detailsDto;
    }

    /**
     * Get statistics for a specific test (all students' best attempts)
     */
    public StatisticViewDto getTestStatistics(String token, Long testId) {
        User currentUser = authService.getCurrentUser(token.replace("Bearer ", ""));
        Test test = testRepository.findById(testId)
                .orElseThrow(() -> new RuntimeException("Test not found"));

        if (!canAccessSubjectStatistics(currentUser, test.getSubject().getId())) {
            throw new RuntimeException("You don't have permission to view this test's statistics");
        }

        List<TestResult> allResults = testResultRepository.findByTestId(testId);

        // Group results by student and find best attempt for each
        Map<Long, List<TestResult>> resultsByStudent = allResults.stream()
                .collect(Collectors.groupingBy(r -> r.getStudent().getId()));

        List<UserStatDto> studentStats = new ArrayList<>();

        resultsByStudent.forEach((studentId, results) -> {
            // Filter only completed attempts with valid scores
            List<TestResult> validResults = results.stream()
                    .filter(r -> r.isCompleted())
                    .filter(r -> r.getScore() != null && r.getMaxScore() != null && r.getMaxScore() > 0)
                    .collect(Collectors.toList());

            if (!validResults.isEmpty()) {
                // Find best attempt based on percentage score rather than raw score
                TestResult bestAttempt = validResults.stream()
                        .max(Comparator.comparingDouble(r ->
                                (double) r.getScore() / r.getMaxScore()))
                        .orElse(null);

                if (bestAttempt != null) {
                    User student = bestAttempt.getStudent();
                    UserStatDto statDto = new UserStatDto();
                    statDto.setUserId(student.getId());
                    statDto.setUserName(student.getFullName());
                    statDto.setGradeId(student.getGrade().getId());
                    statDto.setGradeName(student.getGrade().getFullName());
                    statDto.setScore(bestAttempt.getScore());
                    statDto.setMaxScore(bestAttempt.getMaxScore());
                    statDto.setCompletedAt(bestAttempt.getCompletedAt());
                    statDto.setAttemptNumber(bestAttempt.getAttemptNumber());

                    // Calculate percentage based on actual questions shown
                    double percentage = (double) bestAttempt.getScore() / bestAttempt.getMaxScore() * 100;
                    statDto.setAveragePercentage(Math.round(percentage * 100) / 100.0);

                    studentStats.add(statDto);
                }
            }
        });

        // Sort by percentage (descending) instead of raw score
        studentStats.sort(Comparator.comparingDouble(UserStatDto::getAveragePercentage).reversed());

        StatisticViewDto viewDto = new StatisticViewDto();
        viewDto.setTestId(test.getId());
        viewDto.setTestTitle(test.getTitle());
        viewDto.setSubjectId(test.getSubject().getId());
        viewDto.setSubjectName(test.getSubject().getName());
        viewDto.setUserStats(studentStats);
        viewDto.setTotalStudents(studentStats.size());
        viewDto.setAverageScore(calculateAverageScore(studentStats));

        return viewDto;
    }


    /**
     * Get statistics for a specific grade (all students' best test attempts)
     */
    public StatisticViewDto getGradeStatistics(String token, Long gradeId) {
        User currentUser = authService.getCurrentUser(token.replace("Bearer ", ""));

        if (!canAccessStatistics(token, gradeId, StatisticsAccessType.GRADE)) {
            throw new RuntimeException("You don't have permission to view this grade's statistics");
        }

        Grade grade = gradeRepository.findById(gradeId)
                .orElseThrow(() -> new RuntimeException("Grade not found"));

        List<User> students = userRepository.findByGradeId(gradeId);
        List<UserStatDto> studentStats = new ArrayList<>();

        for (User student : students) {
            List<TestResult> allResults = testResultRepository.findByStudentId(student.getId());

            // Group results by test and find best attempt for each
            Map<Long, List<TestResult>> resultsByTest = allResults.stream()
                    .collect(Collectors.groupingBy(r -> r.getTest().getId()));

            int totalScore = 0;
            int totalMaxScore = 0;
            int completedTests = 0;

            for (List<TestResult> testResults : resultsByTest.values()) {
                // Filter only completed attempts with valid scores
                List<TestResult> validResults = testResults.stream()
                        .filter(r -> r.isCompleted())
                        .filter(r -> r.getScore() != null && r.getMaxScore() != null && r.getMaxScore() > 0)
                        .collect(Collectors.toList());

                if (!validResults.isEmpty()) {
                    // Find best attempt based on percentage score rather than raw score
                    TestResult bestAttempt = validResults.stream()
                            .max(Comparator.comparingDouble(r ->
                                    (double) r.getScore() / r.getMaxScore()))
                            .orElse(null);

                    if (bestAttempt != null) {
                        totalScore += bestAttempt.getScore();
                        totalMaxScore += bestAttempt.getMaxScore();
                        completedTests++;
                    }
                }
            }

            if (completedTests > 0) {
                UserStatDto statDto = new UserStatDto();
                statDto.setUserId(student.getId());
                statDto.setUserName(student.getFullName());
                statDto.setGradeId(grade.getId());
                statDto.setGradeName(grade.getFullName());
                statDto.setScore(totalScore);
                statDto.setMaxScore(totalMaxScore);
                statDto.setCompletedTests(completedTests);

                // Calculate percentage based on actual questions shown
                double averagePercentage = totalMaxScore > 0 ?
                        (double) totalScore / totalMaxScore * 100 : 0;
                statDto.setAveragePercentage(Math.round(averagePercentage * 100) / 100.0);

                studentStats.add(statDto);
            }
        }

        // Sort by average percentage (descending)
        studentStats.sort(Comparator.comparingDouble(UserStatDto::getAveragePercentage).reversed());

        StatisticViewDto viewDto = new StatisticViewDto();
        viewDto.setGradeId(grade.getId());
        viewDto.setGradeName(grade.getFullName());
        viewDto.setUserStats(studentStats);
        viewDto.setTotalStudents(studentStats.size());
        viewDto.setAverageScore(calculateAverageScore(studentStats));

        return viewDto;
    }


    /**
     * Get statistics for a specific subject (all students' best test attempts)
     */
    public StatisticViewDto getSubjectStatistics(String token, Long subjectId) {
        User currentUser = authService.getCurrentUser(token.replace("Bearer ", ""));

        if (!canAccessStatistics(token, subjectId, StatisticsAccessType.SUBJECT)) {
            throw new RuntimeException("You don't have permission to view this subject's statistics");
        }

        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> new RuntimeException("Subject not found"));

        List<Test> tests = testRepository.findBySubjectId(subjectId);
        Map<Long, List<TestResult>> resultsByStudentId = new HashMap<>();

        for (Test test : tests) {
            List<TestResult> testResults = testResultRepository.findByTestId(test.getId());

            for (TestResult result : testResults) {
                Long studentId = result.getStudent().getId();
                resultsByStudentId.computeIfAbsent(studentId, k -> new ArrayList<>())
                        .add(result);
            }
        }

        List<UserStatDto> studentStats = new ArrayList<>();

        resultsByStudentId.forEach((studentId, results) -> {
            // Group results by test
            Map<Long, List<TestResult>> resultsByTest = results.stream()
                    .collect(Collectors.groupingBy(r -> r.getTest().getId()));

            int totalScore = 0;
            int totalMaxScore = 0;
            int completedTests = 0;

            for (List<TestResult> testResults : resultsByTest.values()) {
                // Filter only completed attempts with valid scores
                List<TestResult> validResults = testResults.stream()
                        .filter(r -> r.isCompleted())
                        .filter(r -> r.getScore() != null && r.getMaxScore() != null && r.getMaxScore() > 0)
                        .collect(Collectors.toList());

                if (!validResults.isEmpty()) {
                    // Find best attempt based on percentage score rather than raw score
                    TestResult bestAttempt = validResults.stream()
                            .max(Comparator.comparingDouble(r ->
                                    (double) r.getScore() / r.getMaxScore()))
                            .orElse(null);

                    if (bestAttempt != null) {
                        totalScore += bestAttempt.getScore();
                        totalMaxScore += bestAttempt.getMaxScore();
                        completedTests++;
                    }
                }
            }

            if (completedTests > 0) {
                User student = userRepository.findById(studentId)
                        .orElseThrow(() -> new RuntimeException("Student not found"));

                UserStatDto statDto = new UserStatDto();
                statDto.setUserId(student.getId());
                statDto.setUserName(student.getFullName());
                statDto.setGradeId(student.getGrade().getId());
                statDto.setGradeName(student.getGrade().getFullName());
                statDto.setScore(totalScore);
                statDto.setMaxScore(totalMaxScore);
                statDto.setCompletedTests(completedTests);

                // Calculate percentage based on actual questions shown
                double averagePercentage = totalMaxScore > 0 ?
                        (double) totalScore / totalMaxScore * 100 : 0;
                statDto.setAveragePercentage(Math.round(averagePercentage * 100) / 100.0);

                studentStats.add(statDto);
            }
        });

        // Sort by average percentage (descending)
        studentStats.sort(Comparator.comparingDouble(UserStatDto::getAveragePercentage).reversed());

        StatisticViewDto viewDto = new StatisticViewDto();
        viewDto.setSubjectId(subject.getId());
        viewDto.setSubjectName(subject.getName());
        viewDto.setUserStats(studentStats);
        viewDto.setTotalStudents(studentStats.size());
        viewDto.setAverageScore(calculateAverageScore(studentStats));

        return viewDto;
    }

    /**
     * Get student's statistics for a specific subject
     */
    public StatisticViewDto getStudentSubjectStatistics(String token, Long studentId, Long subjectId) {
        User currentUser = authService.getCurrentUser(token.replace("Bearer ", ""));

        if (!canAccessStatistics(token, studentId, StatisticsAccessType.STUDENT)) {
            throw new RuntimeException("You don't have permission to view this student's statistics");
        }

        User student = userRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found"));

        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> new RuntimeException("Subject not found"));

        List<Test> tests = testRepository.findBySubjectId(subjectId);
        List<SubjectStatDto> testStats = new ArrayList<>();

        for (Test test : tests) {
            List<TestResult> results = testResultRepository.findByStudentIdAndTestId(studentId, test.getId());

            // Filter only completed attempts with valid scores
            List<TestResult> validResults = results.stream()
                    .filter(r -> r.isCompleted())
                    .filter(r -> r.getScore() != null && r.getMaxScore() != null && r.getMaxScore() > 0)
                    .collect(Collectors.toList());

            if (!validResults.isEmpty()) {
                // Find best attempt based on percentage score rather than raw score
                TestResult bestAttempt = validResults.stream()
                        .max(Comparator.comparingDouble(r ->
                                (double) r.getScore() / r.getMaxScore()))
                        .orElse(null);

                if (bestAttempt != null) {
                    SubjectStatDto statDto = new SubjectStatDto();
                    statDto.setTestId(test.getId());
                    statDto.setTestTitle(test.getTitle());
                    statDto.setScore(bestAttempt.getScore());
                    statDto.setMaxScore(bestAttempt.getMaxScore());
                    statDto.setCompletedAt(bestAttempt.getCompletedAt());
                    statDto.setAttemptNumber(bestAttempt.getAttemptNumber());

                    // Calculate percentage based on actual questions shown
                    double percentage = (double) bestAttempt.getScore() / bestAttempt.getMaxScore() * 100;
                    statDto.setPercentage(Math.round(percentage * 100) / 100.0);

                    testStats.add(statDto);
                }
            }
        }

        // Sort by completion date (descending)
        testStats.sort(Comparator.comparing(SubjectStatDto::getCompletedAt).reversed());

        StatisticViewDto viewDto = new StatisticViewDto();
        viewDto.setStudentId(student.getId());
        viewDto.setStudentName(student.getFullName());

        // Check for null before accessing Grade
        if (student.getGrade() != null) {
            viewDto.setGradeId(student.getGrade().getId());
            viewDto.setGradeName(student.getGrade().getFullName());
        } else {
            viewDto.setGradeId(null);
            viewDto.setGradeName("Класс не назначен");
        }

        viewDto.setSubjectId(subject.getId());
        viewDto.setSubjectName(subject.getName());
        viewDto.setTestStats(testStats);
        viewDto.setCompletedTests(testStats.size());
        viewDto.setAveragePercentage(calculateAveragePercentage(testStats));

        return viewDto;
    }

    /**
     * Get student's overall performance across all subjects
     */
    public Map<String, StatisticViewDto> getStudentOverallPerformance(String token, Long studentId) {
        User currentUser = authService.getCurrentUser(token.replace("Bearer ", ""));

        if (!canAccessStatistics(token, studentId, StatisticsAccessType.STUDENT)) {
            throw new RuntimeException("You don't have permission to view this student's statistics");
        }

        User student = userRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found"));

        List<Subject> subjects = subjectRepository.findAll();
        Map<String, StatisticViewDto> subjectStatistics = new HashMap<>();

        for (Subject subject : subjects) {
            List<Test> tests = testRepository.findBySubjectId(subject.getId());
            List<SubjectStatDto> testStats = new ArrayList<>();

            for (Test test : tests) {
                List<TestResult> results = testResultRepository.findByStudentIdAndTestId(studentId, test.getId());

                // Filter only completed attempts
                List<TestResult> completedResults = results.stream()
                        .filter(TestResult::isCompleted)
                        .filter(r -> r.getScore() != null && r.getMaxScore() != null && r.getMaxScore() > 0)
                        .collect(Collectors.toList());

                if (!completedResults.isEmpty()) {
                    // Find the best attempt based on percentage score rather than raw score
                    TestResult bestAttempt = completedResults.stream()
                            .max(Comparator.comparingDouble(r ->
                                    (double) r.getScore() / r.getMaxScore()))
                            .orElse(null);

                    if (bestAttempt != null) {
                        SubjectStatDto statDto = new SubjectStatDto();
                        statDto.setTestId(test.getId());
                        statDto.setTestTitle(test.getTitle());
                        statDto.setScore(bestAttempt.getScore());
                        statDto.setMaxScore(bestAttempt.getMaxScore());
                        statDto.setCompletedAt(bestAttempt.getCompletedAt());
                        statDto.setAttemptNumber(bestAttempt.getAttemptNumber());

                        // Calculate percentage based on the actual questions shown to the student
                        double percentage = (double) bestAttempt.getScore() / bestAttempt.getMaxScore() * 100;
                        statDto.setPercentage(Math.round(percentage * 100) / 100.0); // Round to 2 decimal places

                        testStats.add(statDto);
                    }
                }
            }

            if (!testStats.isEmpty()) {
                // Sort by completion date (descending)
                testStats.sort(Comparator.comparing(SubjectStatDto::getCompletedAt).reversed());

                StatisticViewDto viewDto = new StatisticViewDto();
                viewDto.setStudentId(student.getId());
                viewDto.setStudentName(student.getFullName());
                viewDto.setGradeId(student.getGrade().getId());
                viewDto.setGradeName(student.getGrade().getFullName());
                viewDto.setSubjectId(subject.getId());
                viewDto.setSubjectName(subject.getName());
                viewDto.setTestStats(testStats);
                viewDto.setCompletedTests(testStats.size());

                // Calculate the average percentage more accurately
                viewDto.setAveragePercentage(calculateAveragePercentage(testStats));

                subjectStatistics.put(subject.getName(), viewDto);
            }
        }

        return subjectStatistics;
    }


    /**
     * Get top students in school across all subjects
     */
    public StatisticViewDto getTopStudentsInSchool(String token) {
        User currentUser = authService.getCurrentUser(token.replace("Bearer ", ""));

        // Only admin and teachers can view school-wide statistics
        if (currentUser.getRole() != UserRole.ADMIN && currentUser.getRole() != UserRole.TEACHER) {
            throw new RuntimeException("You don't have permission to view school-wide statistics");
        }

        List<User> students = userRepository.findByRole(UserRole.STUDENT);
        List<UserStatDto> studentStats = new ArrayList<>();

        for (User student : students) {
            List<TestResult> allResults = testResultRepository.findByStudentId(student.getId());

            // Group results by test and find best attempt for each
            Map<Long, List<TestResult>> resultsByTest = allResults.stream()
                    .collect(Collectors.groupingBy(r -> r.getTest().getId()));

            int totalScore = 0;
            int totalMaxScore = 0;
            int completedTests = 0;

            for (List<TestResult> testResults : resultsByTest.values()) {
                // Filter only completed attempts with valid scores
                List<TestResult> validResults = testResults.stream()
                        .filter(r -> r.isCompleted())
                        .filter(r -> r.getScore() != null && r.getMaxScore() != null && r.getMaxScore() > 0)
                        .collect(Collectors.toList());

                if (!validResults.isEmpty()) {
                    // Find best attempt based on percentage score rather than raw score
                    TestResult bestAttempt = validResults.stream()
                            .max(Comparator.comparingDouble(r ->
                                    (double) r.getScore() / r.getMaxScore()))
                            .orElse(null);

                    if (bestAttempt != null) {
                        totalScore += bestAttempt.getScore();
                        totalMaxScore += bestAttempt.getMaxScore();
                        completedTests++;
                    }
                }
            }

            if (completedTests > 0) {
                UserStatDto statDto = new UserStatDto();
                statDto.setUserId(student.getId());
                statDto.setUserName(student.getFullName());

                // Check for null before accessing Grade
                if (student.getGrade() != null) {
                    statDto.setGradeId(student.getGrade().getId());
                    statDto.setGradeName(student.getGrade().getFullName());
                } else {
                    statDto.setGradeId(null);
                    statDto.setGradeName("Класс не назначен");
                }

                statDto.setScore(totalScore);
                statDto.setMaxScore(totalMaxScore);
                statDto.setCompletedTests(completedTests);

                // Calculate percentage based on actual questions shown
                double averagePercentage = totalMaxScore > 0 ?
                        (double) totalScore / totalMaxScore * 100 : 0;
                statDto.setAveragePercentage(Math.round(averagePercentage * 100) / 100.0);

                studentStats.add(statDto);
            }
        }

        // Sort by average percentage (descending)
        studentStats.sort(Comparator.comparingDouble(UserStatDto::getAveragePercentage).reversed());

        // Limit to top 20 students
        List<UserStatDto> topStudents = studentStats.stream()
                .limit(20)
                .collect(Collectors.toList());

        StatisticViewDto viewDto = new StatisticViewDto();
        viewDto.setViewTitle("Лучшие ученики школы");
        viewDto.setUserStats(topStudents);
        viewDto.setTotalStudents(topStudents.size());
        viewDto.setAverageScore(calculateAverageScore(topStudents));

        return viewDto;
    }

    // Helper methods
    private double calculateAverageScore(List<UserStatDto> stats) {
        if (stats.isEmpty()) {
            return 0.0;
        }

        double totalPercentage = stats.stream()
                .mapToDouble(UserStatDto::getAveragePercentage)
                .sum();

        return totalPercentage / stats.size();
    }

    private double calculateAveragePercentage(List<SubjectStatDto> stats) {
        if (stats.isEmpty()) {
            return 0.0;
        }

        double totalPercentage = stats.stream()
                .mapToDouble(SubjectStatDto::getPercentage)
                .sum();

        return totalPercentage / stats.size();
    }

    // Enum for statistics access type
    public enum StatisticsAccessType {
        TEST_RESULT,
        STUDENT,
        GRADE,
        SUBJECT
    }
}