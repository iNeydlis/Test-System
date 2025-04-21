package org.ineydlis.schooltest.service;

import org.ineydlis.schooltest.dto.*;
import org.ineydlis.schooltest.model.*;
import org.ineydlis.schooltest.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class TestService {
    @Value("${app.upload.dir:${user.home}/uploads/materials}")
    private String uploadDir;
    @Autowired
    private TestRepository testRepository;

    @Autowired
    private QuestionRepository questionRepository;

    @Autowired
    private SubjectRepository subjectRepository;

    @Autowired
    private GradeRepository gradeRepository;

    @Autowired
    private UserRepository userRepository;

    private void createUploadDirectoryIfNeeded() {
        try {
            Path dirPath = Paths.get(uploadDir);
            if (!Files.exists(dirPath)) {
                Files.createDirectories(dirPath);
            }
        } catch (IOException e) {
            throw new RuntimeException("Не удалось создать директорию для загрузки файлов", e);
        }
    }
    private String generateUniqueFilename(Long testId, String originalFilename) {
        return "test_" + testId + "_" + System.currentTimeMillis() + "_" + originalFilename;
    }

    private void saveReferenceMaterials(Test test, MultipartFile file) {
        if (file != null && !file.isEmpty()) {
            try {
                createUploadDirectoryIfNeeded();

                // Generate a unique filename
                String filename = generateUniqueFilename(test.getId(), file.getOriginalFilename());
                Path targetLocation = Paths.get(uploadDir).resolve(filename);

                // Copy the file to the target location
                Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

                // Set the reference materials properties
                test.setReferenceMaterialsFilename(file.getOriginalFilename());
                test.setReferenceMaterialsPath(filename);
            } catch (IOException e) {
                throw new RuntimeException("Не удалось сохранить файл справочных материалов", e);
            }
        }
    }


    @Autowired
    private TestResultRepository testResultRepository;
    private void deleteReferenceMaterials(Test test) {
        if (test.getReferenceMaterialsPath() != null) {
            try {
                Path filePath = Paths.get(uploadDir).resolve(test.getReferenceMaterialsPath());
                Files.deleteIfExists(filePath);

                // Clear the reference materials properties
                test.setReferenceMaterialsFilename(null);
                test.setReferenceMaterialsPath(null);
            } catch (IOException e) {
                throw new RuntimeException("Не удалось удалить файл справочных материалов", e);
            }
        }
    }

    public Resource getReferenceMaterialsFile(Long testId, Long userId) {
        Test test = testRepository.findById(testId)
                .orElseThrow(() -> new RuntimeException("Тест не найден"));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Пользователь не найден"));

        // Check permissions
        if (user.getRole() == UserRole.STUDENT) {
            // Students can only access active tests for their grade
            if (!test.isActive() || !test.getAvailableGrades().contains(user.getGrade())) {
                throw new RuntimeException("У вас нет доступа к этому тесту");
            }
        } else if (user.getRole() == UserRole.TEACHER) {
            // Teachers can only access their own tests or tests for subjects they teach
            boolean isCreator = test.getCreator().getId().equals(userId);
            boolean teachesSubject = user.getSubjects().stream()
                    .anyMatch(s -> s.getId().equals(test.getSubject().getId()));

            if (!isCreator && !teachesSubject) {
                throw new RuntimeException("У вас нет доступа к этому тесту");
            }
        } else if (user.getRole() != UserRole.ADMIN) {
            throw new RuntimeException("У вас нет прав на доступ к справочным материалам");
        }

        // Check if test has reference materials
        if (test.getReferenceMaterialsPath() == null) {
            throw new RuntimeException("У этого теста нет справочных материалов");
        }

        try {
            Path filePath = Paths.get(uploadDir).resolve(test.getReferenceMaterialsPath());
            Resource resource = new UrlResource(filePath.toUri());

            if (resource.exists()) {
                return resource;
            } else {
                throw new RuntimeException("Файл справочных материалов не найден");
            }
        } catch (IOException e) {
            throw new RuntimeException("Не удалось получить файл справочных материалов", e);
        }
    }

    public String getReferenceMaterialsFilename(Long testId) {
        Test test = testRepository.findById(testId)
                .orElseThrow(() -> new RuntimeException("Тест не найден"));

        if (test.getReferenceMaterialsFilename() == null) {
            return "reference-material.pdf";
        }

        return test.getReferenceMaterialsFilename();
    }

    // For teachers: Create a new test
    @Transactional
    public TestDto createTest(TestCreateRequest request,MultipartFile referenceMaterials, Long creatorId) {
        User creator = userRepository.findById(creatorId)
                .orElseThrow(() -> new RuntimeException("Пользователь не найден"));

        // Verify that the teacher teaches this subject
        Subject subject = subjectRepository.findById(request.getSubjectId())
                .orElseThrow(() -> new RuntimeException("Предмет не найден"));

        if (creator.getRole() == UserRole.TEACHER) {
            boolean canTeach = creator.getSubjects().stream()
                    .anyMatch(s -> s.getId().equals(subject.getId()));
            if (!canTeach) {
                throw new RuntimeException("Вы не можете создавать тесты по данному предмету");
            }

            // Verify that teacher is assigned to at least one of the specified grades
            if (request.getGradeIds() != null && !request.getGradeIds().isEmpty()) {
                boolean hasPermissionForGrades = false;

                // Get the set of grade IDs the teacher is assigned to
                Set<Long> teacherGradeIds = creator.getTeachingGrades().stream()
                        .map(Grade::getId)
                        .collect(Collectors.toSet());

                // Check if there's an overlap between requested grades and teacher's assigned grades
                for (Long gradeId : request.getGradeIds()) {
                    if (teacherGradeIds.contains(gradeId)) {
                        hasPermissionForGrades = true;
                        break;
                    }
                }

                if (!hasPermissionForGrades) {
                    throw new RuntimeException("Вы не можете создавать тесты для указанных классов, так как не являетесь преподавателем в этих классах");
                }
            }
        } else if (creator.getRole() != UserRole.ADMIN) {
            throw new RuntimeException("У вас нет прав на создание тестов");
        }

        // Create the test
        Test test = new Test();
        test.setTitle(request.getTitle());
        test.setDescription(request.getDescription());
        test.setSubject(subject);
        test.setCreator(creator);
        test.setCreatedAt(LocalDateTime.now());
        test.setTimeLimit(request.getTimeLimit());
        test.setQuestionsToShow(request.getQuestionsToShow());
        test.setMaxAttempts(request.getMaxAttempts());

        // Add available grades
        if (request.getGradeIds() != null && !request.getGradeIds().isEmpty()) {
            Set<Grade> grades = request.getGradeIds().stream()
                    .map(id -> gradeRepository.findById(id)
                            .orElseThrow(() -> new RuntimeException("Класс не найден: " + id)))
                    .collect(Collectors.toSet());
            test.setAvailableGrades(grades);
        }

        Test savedTest = testRepository.save(test);

        if (referenceMaterials != null && !referenceMaterials.isEmpty()) {
            saveReferenceMaterials(savedTest, referenceMaterials);
            testRepository.save(savedTest);
        }

        // Create questions and answers
        if (request.getQuestions() != null) {
            for (QuestionDto questionDto : request.getQuestions()) {
                Question question = new Question();
                question.setText(questionDto.getText());
                question.setType(questionDto.getType());
                question.setPoints(questionDto.getPoints());
                question.setTest(savedTest);

                Question savedQuestion = questionRepository.save(question);

                // Create answers for this question
                if (questionDto.getAnswers() != null) {
                    for (AnswerDto answerDto : questionDto.getAnswers()) {
                        Answer answer = new Answer();
                        answer.setText(answerDto.getText());
                        answer.setCorrect(answerDto.getIsCorrect() != null ? answerDto.getIsCorrect() : false);
                        answer.setQuestion(savedQuestion);
                        savedQuestion.getAnswers().add(answer);
                    }
                }

                questionRepository.save(savedQuestion);
                savedTest.getQuestions().add(savedQuestion);
            }
        }

        // Return the created test
        return TestDto.fromEntity(savedTest);
    }

    // Get all tests (for admins)
    public List<TestDto> getAllTests() {
        return testRepository.findAll().stream()
                .map(TestDto::fromEntity)
                .collect(Collectors.toList());
    }

    // Get tests by teacher
    public List<TestDto> getTestsByTeacher(Long teacherId) {
        User teacher = userRepository.findById(teacherId)
                .orElseThrow(() -> new RuntimeException("Пользователь не найден"));
        return testRepository.findByCreator(teacher).stream()
                .map(TestDto::fromEntity)
                .collect(Collectors.toList());
    }

    public List<TestDto> getTestsForStudent(Long studentId) {
        // Начало метода без изменений
        User student = userRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Пользователь не найден"));

        if (student.getRole() != UserRole.STUDENT) {
            throw new RuntimeException("Пользователь не является учеником");
        }

        if (student.getGrade() == null) {
            return Collections.emptyList();
        }

        List<Test> tests = testRepository.findByAvailableGradesAndActive(student.getGrade());
        List<TestDto> testDtos = new ArrayList<>();

        for (Test test : tests) {
            TestDto testDto = TestDto.fromEntity(test);

            // Найдем все попытки для этого теста и этого ученика
            List<TestResult> attempts = testResultRepository.findByTestAndStudent(test, student);

            // Найдем лучшую попытку по процентному соотношению (score/maxScore)
            TestResult bestAttempt = attempts.stream()
                    .filter(TestResult::isCompleted)
                    .max(Comparator.comparing(tr -> {
                        // Избегаем деления на ноль
                        if (tr.getMaxScore() == null || tr.getMaxScore() == 0) {
                            return 0.0;
                        }
                        return tr.getScore() * 100.0 / tr.getMaxScore();
                    }))
                    .orElse(null);

            if (bestAttempt != null) {
                // Установим лучший результат
                testDto.setBestScore(bestAttempt.getScore());

                // ВАЖНОЕ ИЗМЕНЕНИЕ: Используем реальный максимальный балл из этой попытки,
                // который теперь основан только на отобранных вопросах
                testDto.setMaxScore(bestAttempt.getMaxScore());

                // Добавим процентное значение для корректного отображения
                if (bestAttempt.getMaxScore() != null && bestAttempt.getMaxScore() > 0) {
                    testDto.setBestScorePercentage((double) bestAttempt.getScore() / bestAttempt.getMaxScore() * 100);
                } else {
                    testDto.setBestScorePercentage(0.0);
                }
            } else {
                // Если попыток еще не было, показываем максимальный балл для всех вопросов,
                // но с примечанием, что реальный балл может быть другим при случайном выборе
                testDto.setMaxScore(testDto.getTotalPoints());
            }

            // Вычислим кол-во оставшихся попыток
            long completedAttempts = attempts.stream()
                    .filter(TestResult::isCompleted)
                    .count();

            int remainingAttempts = test.getMaxAttempts() - (int)completedAttempts;
            testDto.setRemainingAttempts(Math.max(0, remainingAttempts));

            testDtos.add(testDto);
        }

        return testDtos;
    }

    // Update getTestWithQuestions method in your backend
    public TestDto getTestWithQuestions(Long testId, Long userId, boolean includeAnswers) {
        Test test = testRepository.findById(testId)
                .orElseThrow(() -> new RuntimeException("Тест не найден"));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Пользователь не найден"));

        // Check permissions
        if (user.getRole() == UserRole.STUDENT) {
            // Students can only view active tests available to their grade
            if (!test.isActive() || !test.getAvailableGrades().contains(user.getGrade())) {
                throw new RuntimeException("У вас нет доступа к этому тесту");
            }
            // Students should never see correct answers before taking the test
            includeAnswers = false;
        } else if (user.getRole() == UserRole.TEACHER) {
            // Teachers can only view their own tests or tests for subjects they teach
            boolean isCreator = test.getCreator().getId().equals(userId);
            boolean teachesSubject = user.getSubjects().stream()
                    .anyMatch(s -> s.getId().equals(test.getSubject().getId()));

            if (!isCreator && !teachesSubject) {
                throw new RuntimeException("У вас нет доступа к этому тесту");
            }
        }

        TestDto testDto = TestDto.fromEntity(test);

        // Add questions if requested and user has appropriate permissions
        if (includeAnswers && (user.getRole() == UserRole.TEACHER || user.getRole() == UserRole.ADMIN)) {
            testDto.setQuestions(test.getQuestions().stream()
                    .map(q -> QuestionDto.fromEntity(q, true))
                    .collect(Collectors.toList()));
        } else {
            // Just set the question count
            testDto.setQuestionCount(test.getQuestions().size());
        }

        return testDto;
    }

    // Update a test (for teachers and admins)
    @Transactional
    public TestDto updateTest(Long testId, TestCreateRequest request,MultipartFile referenceMaterials, boolean removeReferenceMaterials,  Long userId) {
        Test test = testRepository.findById(testId)
                .orElseThrow(() -> new RuntimeException("Тест не найден"));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Пользователь не найден"));

        // Check permissions
        if (user.getRole() == UserRole.TEACHER && !test.getCreator().getId().equals(userId)) {
            throw new RuntimeException("Вы можете редактировать только свои тесты");
        } else if (user.getRole() != UserRole.ADMIN && user.getRole() != UserRole.TEACHER) {
            throw new RuntimeException("У вас нет прав на редактирование тестов");
        }

        // Delete test results
        List<TestResult> results = testResultRepository.findByTest(test);
        testResultRepository.deleteAll(results);

        // Update test properties instead of recreating
        test.setTitle(request.getTitle());
        test.setDescription(request.getDescription());
        test.setTimeLimit(request.getTimeLimit());
        test.setQuestionsToShow(request.getQuestionsToShow());
        test.setMaxAttempts(request.getMaxAttempts());
        test.setUpdatedAt(LocalDateTime.now());

        // Update subject
        Subject subject = subjectRepository.findById(request.getSubjectId())
                .orElseThrow(() -> new RuntimeException("Предмет не найден"));
        test.setSubject(subject);

        // Update grades
        if (request.getGradeIds() != null) {
            test.getAvailableGrades().clear();
            Set<Grade> grades = request.getGradeIds().stream()
                    .map(id -> gradeRepository.findById(id)
                            .orElseThrow(() -> new RuntimeException("Класс не найден: " + id)))
                    .collect(Collectors.toSet());
            test.setAvailableGrades(grades);
        }
        if (removeReferenceMaterials) {
            // Delete existing reference materials
            deleteReferenceMaterials(test);
        }

        if (referenceMaterials != null && !referenceMaterials.isEmpty()) {
            // Delete old reference materials if they exist
            if (test.getReferenceMaterialsPath() != null) {
                deleteReferenceMaterials(test);
            }
            // Save new reference materials
            saveReferenceMaterials(test, referenceMaterials);
        }
        // Clear and update questions
        questionRepository.deleteAll(test.getQuestions());
        test.getQuestions().clear();

        // Add new questions
        if (request.getQuestions() != null) {
            for (QuestionDto questionDto : request.getQuestions()) {
                Question question = new Question();
                question.setText(questionDto.getText());
                question.setType(questionDto.getType());
                question.setPoints(questionDto.getPoints());
                question.setTest(test);

                // Create answers
                if (questionDto.getAnswers() != null) {
                    for (AnswerDto answerDto : questionDto.getAnswers()) {
                        Answer answer = new Answer();
                        answer.setText(answerDto.getText());
                        answer.setCorrect(answerDto.getIsCorrect() != null ? answerDto.getIsCorrect() : false);
                        answer.setQuestion(question);
                        question.getAnswers().add(answer);
                    }
                }
                test.getQuestions().add(question);
            }
        }

        // Save and return
        Test savedTest = testRepository.save(test);
        return TestDto.fromEntity(savedTest);
    }
    @Transactional
    public void permanentlyDeleteTest(Long testId, Long userId) {
        Test test = testRepository.findById(testId)
                .orElseThrow(() -> new RuntimeException("Тест не найден"));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Пользователь не найден"));

        // Check permissions - only admins or the creator of the test can permanently delete it
        if (user.getRole() == UserRole.TEACHER && !test.getCreator().getId().equals(userId)) {
            throw new RuntimeException("Вы можете полностью удалять только свои тесты");
        } else if (user.getRole() != UserRole.ADMIN && user.getRole() != UserRole.TEACHER) {
            throw new RuntimeException("У вас нет прав на полное удаление тестов");
        }

        if (test.getReferenceMaterialsPath() != null) {
            deleteReferenceMaterials(test);
        }

        // Find and delete all test results associated with this test
        List<TestResult> results = testResultRepository.findByTest(test);
        testResultRepository.deleteAll(results);

        // Delete the test itself
        testRepository.delete(test);
    }
    // Delete a test (for teachers and admins)
    @Transactional
    public void deleteTest(Long testId, Long userId) {
        Test test = testRepository.findById(testId)
                .orElseThrow(() -> new RuntimeException("Тест не найден"));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Пользователь не найден"));

        // Check permissions
        if (user.getRole() == UserRole.TEACHER && !test.getCreator().getId().equals(userId)) {
            throw new RuntimeException("Вы можете удалять только свои тесты");
        } else if (user.getRole() != UserRole.ADMIN && user.getRole() != UserRole.TEACHER) {
            throw new RuntimeException("У вас нет прав на удаление тестов");
        }

        // Always mark as inactive instead of deleting
        test.setActive(false);
        testRepository.save(test);
    }
    @Transactional
    public TestDto reactivateTest(Long testId, Long userId, boolean clearAttempts) {
        Test test = testRepository.findById(testId)
                .orElseThrow(() -> new RuntimeException("Тест не найден"));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Пользователь не найден"));

        // Check permissions
        if (user.getRole() == UserRole.TEACHER && !test.getCreator().getId().equals(userId)) {
            throw new RuntimeException("Вы можете активировать только свои тесты");
        } else if (user.getRole() != UserRole.ADMIN && user.getRole() != UserRole.TEACHER) {
            throw new RuntimeException("У вас нет прав на активацию тестов");
        }

        // If the test is already active, return it as is
        if (test.isActive()) {
            return TestDto.fromEntity(test);
        }

        // Reactivate the test
        test.setActive(true);
        test.setUpdatedAt(LocalDateTime.now());

        // Clear all attempts if requested
        if (clearAttempts) {
            List<TestResult> results = testResultRepository.findByTest(test);
            testResultRepository.deleteAll(results);
        }

        Test savedTest = testRepository.save(test);
        return TestDto.fromEntity(savedTest);
    }

    public TestResultDto getInProgressTest(Long testId, Long studentId) {
        Test test = testRepository.findById(testId)
                .orElseThrow(() -> new RuntimeException("Тест не найден"));

        User student = userRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Пользователь не найден"));

        if (student.getRole() != UserRole.STUDENT) {
            throw new RuntimeException("Только ученики могут проходить тесты");
        }

        // Check if the student has an ongoing attempt
        Optional<TestResult> existingIncompleteTest =
                testResultRepository.findByTestAndStudentAndCompletedFalse(test, student);

        if (existingIncompleteTest.isPresent()) {
            return TestResultDto.fromEntity(existingIncompleteTest.get());
        }

        // Return null if no in-progress test found
        return null;
    }

    @Transactional(isolation = Isolation.SERIALIZABLE)
    public TestResultDto startTest(Long testId, Long studentId) {
        Test test = testRepository.findById(testId)
                .orElseThrow(() -> new RuntimeException("Тест не найден"));

        User student = userRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Пользователь не найден"));

        if (student.getRole() != UserRole.STUDENT) {
            throw new RuntimeException("Только ученики могут проходить тесты");
        }

        // Check if test is available for student's grade
        if (!test.getAvailableGrades().contains(student.getGrade())) {
            throw new RuntimeException("Тест недоступен для вашего класса");
        }

        // Check if test is active
        if (!test.isActive()) {
            throw new RuntimeException("Тест неактивен");
        }

        // Check attempt limits first
        List<TestResult> completedAttempts = testResultRepository.findByTestAndStudentAndCompleted(
                test, student, true);

        if (completedAttempts.size() >= test.getMaxAttempts()) {
            throw new RuntimeException("Вы достигли максимального количества попыток (" +
                    test.getMaxAttempts() + ") для этого теста");
        }

        // Check if the student has an ongoing attempt - use a more specific query with locking
        List<TestResult> incompleteAttempts =
                testResultRepository.findByTestAndStudentAndCompletedForUpdate(test, student, false);

        // Handle multiple incomplete attempts
        if (!incompleteAttempts.isEmpty()) {
            // Sort by startedAt descending to get the most recent one
            incompleteAttempts.sort((a, b) -> b.getStartedAt().compareTo(a.getStartedAt()));

            // Keep the first one (most recent) and delete the rest
            TestResult mostRecent = incompleteAttempts.get(0);
            for (int i = 1; i < incompleteAttempts.size(); i++) {
                testResultRepository.delete(incompleteAttempts.get(i));
            }

            // Check if the most recent test is too old (e.g., abandoned)
            LocalDateTime deadline = mostRecent.getStartedAt().plusMinutes(test.getTimeLimit());
            if (LocalDateTime.now().isAfter(deadline)) {
                // If the test has expired, mark it as completed with zero score
                mostRecent.setCompleted(true);
                mostRecent.setCompletedAt(LocalDateTime.now());
                mostRecent.setScore(0);
                testResultRepository.save(mostRecent);

                // Create a new test attempt
                return createNewTestAttempt(test, student, completedAttempts.size() + 1);
            }

            return TestResultDto.fromEntity(mostRecent);
        }

        // Create new test result
        return createNewTestAttempt(test, student, completedAttempts.size() + 1);
    }

    // Helper method to create a new test attempt
    private TestResultDto createNewTestAttempt(Test test, User student, int attemptNumber) {
        TestResult testResult = new TestResult();
        testResult.setTest(test);
        testResult.setStudent(student);
        testResult.setStartedAt(LocalDateTime.now());
        testResult.setCompleted(false);
        testResult.setAttemptNumber(attemptNumber);

        // НЕ устанавливаем maxScore тут, а сделаем это после выбора вопросов
        // Изначальное значение будем ставить только для сохранения структуры
        testResult.setMaxScore(0);

        TestResult savedResult = testResultRepository.save(testResult);
        return TestResultDto.fromEntity(savedResult);
    }

    // Get questions for a test (for students taking the test)
    public List<QuestionDto> getTestQuestions(Long testId, Long testResultId, Long studentId) {
        TestResult testResult = testResultRepository.findById(testResultId)
                .orElseThrow(() -> new RuntimeException("Результат теста не найден"));

        // Verify that this test result belongs to the student
        if (!testResult.getStudent().getId().equals(studentId)) {
            throw new RuntimeException("У вас нет доступа к этому тесту");
        }

        // Verify that the test result is for the requested test
        if (!testResult.getTest().getId().equals(testId)) {
            throw new RuntimeException("Несоответствие теста и результата");
        }
        if (testResult.isCompleted()) {
            throw new RuntimeException("Тест уже завершен");
        }

        Test test = testResult.getTest();
        List<Question> allQuestions = test.getQuestions();

        // If questionsToShow is null or less than or equal to 0, or greater than total questions, show all questions
        if (test.getQuestionsToShow() == null || test.getQuestionsToShow() <= 0 || test.getQuestionsToShow() >= allQuestions.size()) {
            // Если отображаются все вопросы, устанавливаем maxScore как сумму баллов всех вопросов
            int totalMaxScore = allQuestions.stream()
                    .mapToInt(Question::getPoints)
                    .sum();
            testResult.setMaxScore(totalMaxScore);
            testResultRepository.save(testResult);

            return allQuestions.stream()
                    .map(q -> QuestionDto.fromEntity(q, false))
                    .collect(Collectors.toList());
        }

        // If this is a new test result without assigned questions, randomly select questions
        if (testResult.getSelectedQuestionIds() == null || testResult.getSelectedQuestionIds().isEmpty()) {
            // Create a copy of the questions list and shuffle it
            List<Question> questionsCopy = new ArrayList<>(allQuestions);
            Collections.shuffle(questionsCopy);

            // Take only the required number of questions
            List<Question> selectedQuestions = questionsCopy.subList(0, test.getQuestionsToShow());

            // Store the selected question IDs in the test result for consistency between requests
            List<Long> selectedQuestionIds = selectedQuestions.stream()
                    .map(Question::getId)
                    .collect(Collectors.toList());

            // ВАЖНО: Вычисляем maxScore на основе выбранных вопросов
            int selectedQuestionsMaxScore = selectedQuestions.stream()
                    .mapToInt(Question::getPoints)
                    .sum();

            testResult.setSelectedQuestionIds(selectedQuestionIds);
            testResult.setMaxScore(selectedQuestionsMaxScore); // Устанавливаем правильный maxScore
            testResultRepository.save(testResult);

            return selectedQuestions.stream()
                    .map(q -> QuestionDto.fromEntity(q, false))
                    .collect(Collectors.toList());
        } else {
            // Use the previously selected questions
            List<Long> selectedQuestionIds = testResult.getSelectedQuestionIds();

            // Create a map for quick lookup of questions by ID
            Map<Long, Question> questionMap = allQuestions.stream()
                    .collect(Collectors.toMap(Question::getId, q -> q));

            // Retrieve the previously selected questions in the original order
            List<Question> selectedQuestions = selectedQuestionIds.stream()
                    .map(questionMap::get)
                    .filter(Objects::nonNull) // Filter out any questions that might have been deleted
                    .collect(Collectors.toList());

            // ВАЖНО: Проверяем, что maxScore соответствует выбранным вопросам
            // Это может быть полезно, если вопросы были изменены между запусками теста
            int selectedQuestionsMaxScore = selectedQuestions.stream()
                    .mapToInt(Question::getPoints)
                    .sum();

            // Обновляем maxScore, если он не соответствует выбранным вопросам
            if (testResult.getMaxScore() != selectedQuestionsMaxScore) {
                testResult.setMaxScore(selectedQuestionsMaxScore);
                testResultRepository.save(testResult);
            }

            return selectedQuestions.stream()
                    .map(q -> QuestionDto.fromEntity(q, false))
                    .collect(Collectors.toList());
        }
    }

    // Submit answers for a test
    @Transactional
    public TestResultDto submitTest(TestSubmissionRequest request, Long studentId) {
        TestResult testResult = testResultRepository.findById(request.getTestResultId())
                .orElseThrow(() -> new RuntimeException("Результат теста не найден"));

        // Verify that this test result belongs to the student
        if (!testResult.getStudent().getId().equals(studentId)) {
            throw new RuntimeException("У вас нет доступа к этому тесту");
        }

        // Verify that the test is not completed
        if (testResult.isCompleted()) {
            throw new RuntimeException("Тест уже завершен");
        }

        Test test = testResult.getTest();
        boolean timeExpired = false;

        // Check if time limit exceeded
        LocalDateTime deadline = testResult.getStartedAt().plusMinutes(testResult.getTest().getTimeLimit());
        if (LocalDateTime.now().isAfter(deadline)) {
            timeExpired = true;
        }

        // Process student answers
        int totalScore = 0;

        // Create a map of questionId -> Question for faster access
        Map<Long, Question> questionMap = test.getQuestions().stream()
                .collect(Collectors.toMap(Question::getId, q -> q));

        // Get the list of questions that should be considered for scoring
        List<Long> questionIdsToConsider;
        if (testResult.getSelectedQuestionIds() != null && !testResult.getSelectedQuestionIds().isEmpty()) {
            questionIdsToConsider = testResult.getSelectedQuestionIds();
        } else {
            // If no specific questions were selected, consider all questions
            questionIdsToConsider = test.getQuestions().stream()
                    .map(Question::getId)
                    .collect(Collectors.toList());
        }

        // ВНИМАНИЕ: maxPossibleScore уже установлен в testResult.getMaxScore()
        // при выборе вопросов, поэтому мы можем его использовать напрямую
        int maxPossibleScore = testResult.getMaxScore();

        // Process each answer
        for (StudentAnswerRequest answerRequest : request.getAnswers()) {
            Question question = questionMap.get(answerRequest.getQuestionId());
            if (question == null) {
                continue; // Skip if question not found
            }

            // Skip questions that were not part of the selected set
            if (!questionIdsToConsider.contains(question.getId())) {
                continue;
            }

            StudentAnswer studentAnswer = new StudentAnswer();
            studentAnswer.setQuestion(question);
            studentAnswer.setTestResult(testResult);

            boolean isCorrect = false;

            switch (question.getType()) {
                case TEXT_ANSWER:
                    studentAnswer.setTextAnswer(answerRequest.getTextAnswer());

                    // For text answers, we need custom logic to determine correctness
                    if (question.getAnswers().size() > 0) {
                        String correctAnswer = question.getAnswers().get(0).getText().trim().toLowerCase();
                        String providedAnswer = answerRequest.getTextAnswer() != null ?
                                answerRequest.getTextAnswer().trim().toLowerCase() : "";
                        isCorrect = correctAnswer.equals(providedAnswer);
                    }
                    break;

                case SINGLE_CHOICE:
                case MULTIPLE_CHOICE:
                    // Get selected answers
                    if (answerRequest.getSelectedAnswerIds() != null && !answerRequest.getSelectedAnswerIds().isEmpty()) {
                        // Create a map of answerId -> Answer for this question
                        Map<Long, Answer> answerMap = question.getAnswers().stream()
                                .collect(Collectors.toMap(Answer::getId, a -> a));

                        // Add selected answers
                        Set<Answer> selectedAnswers = new HashSet<>();
                        for (Long answerId : answerRequest.getSelectedAnswerIds()) {
                            Answer answer = answerMap.get(answerId);
                            if (answer != null) {
                                selectedAnswers.add(answer);
                            }
                        }
                        studentAnswer.setSelectedAnswers(selectedAnswers);

                        if (question.getType() == QuestionType.SINGLE_CHOICE) {
                            // For single choice, the answer is correct if the selected answer is correct
                            if (selectedAnswers.size() == 1) {
                                isCorrect = selectedAnswers.iterator().next().isCorrect();
                            }
                        } // Modified section of the multiple-choice scoring logic
                        else if (question.getType() == QuestionType.MULTIPLE_CHOICE) {
                            // For multiple choice, we calculate points proportionally
                            Set<Answer> allQuestionAnswers = new HashSet<>(question.getAnswers());
                            Set<Answer> correctQuestionAnswers = question.getAnswers().stream()
                                    .filter(Answer::isCorrect)
                                    .collect(Collectors.toSet());

                            if (correctQuestionAnswers.isEmpty()) {
                                // If there are no correct answers, check if student selected nothing
                                isCorrect = selectedAnswers.isEmpty();
                            } else {
                                // Count the student's correct and incorrect selections
                                int totalCorrectAnswers = correctQuestionAnswers.size();

                                // Correctly selected answers (true positive)
                                int correctSelectedCount = 0;
                                for (Answer selected : selectedAnswers) {
                                    if (selected.isCorrect()) {
                                        correctSelectedCount++;
                                    }
                                }

                                // Incorrectly selected answers (false positive)
                                int incorrectSelectedCount = selectedAnswers.size() - correctSelectedCount;

                                // Calculate partial score - modified formula for fairer scoring
                                double correctRatio = (double) correctSelectedCount / totalCorrectAnswers;

                                // Calculate penalty for incorrect selections - proportional to the number of incorrect options
                                int totalIncorrectOptions = allQuestionAnswers.size() - totalCorrectAnswers;
                                double incorrectPenalty = totalIncorrectOptions > 0 ?
                                        (double) incorrectSelectedCount / totalIncorrectOptions : 0;

                                // Final ratio is the percentage of correct answers minus a penalty for incorrect selections
                                // The penalty is scaled to ensure students don't get 0 for minor mistakes
                                double ratio = Math.max(0, correctRatio - (incorrectPenalty * 0.5));

                                // Set partial points
                                int partialPoints = (int) Math.round(question.getPoints() * ratio);
                                studentAnswer.setEarnedPoints(partialPoints);

                                // Technically the answer is only fully correct if ratio == 1.0
                                isCorrect = (ratio == 1.0);
                                studentAnswer.setCorrect(isCorrect);

                                // Store the ratio for reference
                                studentAnswer.setPartialRatio(ratio);

                                // Add points to total score
                                totalScore += partialPoints;

                                // Add student answer to the result and move to next question
                                testResult.getStudentAnswers().add(studentAnswer);
                                continue; // Skip standard scoring logic below
                            }
                        }
                    }
                    break;
            }

            if (question.getType() != QuestionType.MULTIPLE_CHOICE || isCorrect) {
                studentAnswer.setCorrect(isCorrect);
                studentAnswer.setEarnedPoints(isCorrect ? question.getPoints() : 0);
                totalScore += studentAnswer.getEarnedPoints();
            }

            testResult.getStudentAnswers().add(studentAnswer);
        }

        // Mark test as completed
        testResult.setCompleted(true);
        testResult.setCompletedAt(LocalDateTime.now());
        testResult.setScore(totalScore);

        TestResult savedResult = testResultRepository.save(testResult);

        // If time expired, include a message in the result
        TestResultDto resultDto = TestResultDto.fromEntity(savedResult);
        if (timeExpired) {
            resultDto.setMessage("Время выполнения теста истекло. Учтены только предоставленные ответы.");
        }

        return resultDto;
    }
    // Get test results for a student
    public List<TestResultDto> getStudentResults(Long studentId) {
        User student = userRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Пользователь не найден"));

        if (student.getRole() != UserRole.STUDENT) {
            throw new RuntimeException("Пользователь не является учеником");
        }

        return testResultRepository.findByStudent(student).stream()
                .map(TestResultDto::fromEntity)
                .collect(Collectors.toList());
    }
    // Add this to TestService.java
    public TestResultDto getTestResultById(Long resultId, Long userId) {
        TestResult result = testResultRepository.findById(resultId)
                .orElseThrow(() -> new RuntimeException("Результат теста не найден"));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Пользователь не найден"));

        // Check permissions
        if (user.getRole() == UserRole.TEACHER) {
            Test test = result.getTest();
            boolean isCreator = test.getCreator().getId().equals(userId);
            boolean teachesSubject = user.getSubjects().stream()
                    .anyMatch(s -> s.getId().equals(test.getSubject().getId()));

            if (!isCreator && !teachesSubject) {
                throw new RuntimeException("У вас нет доступа к этому результату теста");
            }
        } else if (user.getRole() == UserRole.STUDENT) {
            // Students can only view their own results
            if (!result.getStudent().getId().equals(userId)) {
                throw new RuntimeException("У вас нет доступа к этому результату теста");
            }
        } else if (user.getRole() != UserRole.ADMIN) {
            throw new RuntimeException("У вас нет прав на просмотр результатов теста");
        }

        return TestResultDto.fromEntity(result);
    }
    /**
     * Получить детальную информацию о результате теста, включая ответы студента
     *
     * @param resultId ID результата теста
     * @param userId ID пользователя, запрашивающего информацию
     * @return Детальная информация о результате теста
     */
    public TestResultDetailsDto getTestResultDetails(Long resultId, Long userId) {
        TestResult result = testResultRepository.findById(resultId)
                .orElseThrow(() -> new RuntimeException("Результат теста не найден"));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Пользователь не найден"));

        // Проверка прав доступа
        if (user.getRole() == UserRole.TEACHER) {
            Test test = result.getTest();
            boolean isCreator = test.getCreator().getId().equals(userId);
            boolean teachesSubject = user.getSubjects().stream()
                    .anyMatch(s -> s.getId().equals(test.getSubject().getId()));

            if (!isCreator && !teachesSubject) {
                throw new RuntimeException("У вас нет доступа к этому результату теста");
            }
        } else if (user.getRole() == UserRole.STUDENT) {
            // Студенты могут просматривать только свои результаты
            if (!result.getStudent().getId().equals(userId)) {
                throw new RuntimeException("У вас нет доступа к этому результату теста");
            }
        } else if (user.getRole() != UserRole.ADMIN) {
            throw new RuntimeException("У вас нет прав на просмотр результатов теста");
        }

        // Если результат еще не завершен, выдаем ошибку
        if (!result.isCompleted()) {
            throw new RuntimeException("Этот тест еще не завершен");
        }

        return TestResultDetailsDto.fromEntity(result);
    }
    // Get test results for a test (for teachers and admins)
    public List<TestResultDto> getTestResults(Long testId, Long userId) {
        Test test = testRepository.findById(testId)
                .orElseThrow(() -> new RuntimeException("Тест не найден"));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Пользователь не найден"));

        // Check permissions
        if (user.getRole() == UserRole.TEACHER) {
            boolean isCreator = test.getCreator().getId().equals(userId);
            boolean teachesSubject = user.getSubjects().stream()
                    .anyMatch(s -> s.getId().equals(test.getSubject().getId()));

            if (!isCreator && !teachesSubject) {
                throw new RuntimeException("У вас нет доступа к результатам этого теста");
            }
        } else if (user.getRole() != UserRole.ADMIN) {
            throw new RuntimeException("У вас нет прав на просмотр результатов теста");
        }

        return testResultRepository.findByTest(test).stream()
                .map(TestResultDto::fromEntity)
                .collect(Collectors.toList());
    }
}