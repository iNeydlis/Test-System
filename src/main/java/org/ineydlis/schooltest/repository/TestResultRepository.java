package org.ineydlis.schooltest.repository;

import jakarta.persistence.LockModeType;
import org.ineydlis.schooltest.model.Test;
import org.ineydlis.schooltest.model.TestResult;
import org.ineydlis.schooltest.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface TestResultRepository extends JpaRepository<TestResult, Long> {
    // Add or update these methods in the TestResultRepository interface

    // This gets all incomplete attempts for a test and student
    List<TestResult> findByTestAndStudentAndCompleted(Test test, User student, boolean completed);

    // This gets the single, unique incomplete attempt (if exists) for a test and student
    Optional<TestResult> findByTestAndStudentAndCompletedFalse(Test test, User student);

    // Method to find all results for a given test
    List<TestResult> findByTest(Test test);

    // Method to find all results for a given student
    List<TestResult> findByStudent(User student);

    // Method to find all results for a given test and student
    List<TestResult> findByTestAndStudent(Test test, User student);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT tr FROM TestResult tr WHERE tr.test = :test AND tr.student = :student AND tr.completed = :completed")
    List<TestResult> findByTestAndStudentAndCompletedForUpdate(
            @Param("test") Test test,
            @Param("student") User student,
            @Param("completed") boolean completed);

    @Query("SELECT tr FROM TestResult tr WHERE tr.student.id = :studentId AND tr.test.subject.id = :subjectId AND tr.completed = true")
    List<TestResult> findByStudentIdAndTestSubjectId(Long studentId, Long subjectId);

    // Найти все результаты тестов для конкретного класса
    @Query("SELECT tr FROM TestResult tr WHERE tr.student.grade.id = :gradeId AND tr.completed = true")
    List<TestResult> findByStudentGradeId(Long gradeId);

    // Найти все завершенные тесты
    @Query("SELECT tr FROM TestResult tr WHERE tr.completed = true")
    List<TestResult> findAllCompleted();

    // Найти все результаты для конкретного теста
    List<TestResult> findByTestIdAndCompleted(Long testId, boolean completed);

    // Найти все попытки конкретного ученика по конкретному тесту
    List<TestResult> findByStudentIdAndTestId(Long studentId, Long testId);


    // Найти все результаты тестов с оценкой выше указанной
    @Query("SELECT tr FROM TestResult tr WHERE tr.score >= :minScore AND tr.completed = true")
    List<TestResult> findByScoreGreaterThanEqual(@Param("minScore") Integer minScore);

    // Найти все результаты тестов, завершенные в указанный период времени
    @Query("SELECT tr FROM TestResult tr WHERE tr.completedAt BETWEEN :startDate AND :endDate AND tr.completed = true")
    List<TestResult> findByCompletedAtBetween(
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);

    // Найти топ N лучших результатов по конкретному тесту
    @Query("SELECT tr FROM TestResult tr WHERE tr.test.id = :testId AND tr.completed = true ORDER BY tr.score DESC")
    List<TestResult> findTopResultsByTestId(@Param("testId") Long testId, Pageable pageable);

    // Найти среднюю оценку по тесту
    @Query("SELECT AVG(tr.score) FROM TestResult tr WHERE tr.test.id = :testId AND tr.completed = true")
    Double findAverageScoreByTestId(@Param("testId") Long testId);

    // Найти все тесты, которые студент начал, но не завершил
    @Query("SELECT tr FROM TestResult tr WHERE tr.student.id = :studentId AND tr.completed = false")
    List<TestResult> findIncompleteTestsByStudentId(@Param("studentId") Long studentId);

    // Подсчитать количество попыток для каждого студента по конкретному тесту
    @Query("SELECT tr.student.id, COUNT(tr) FROM TestResult tr WHERE tr.test.id = :testId GROUP BY tr.student.id")
    List<Object[]> countAttemptsByTestIdGroupByStudent(@Param("testId") Long testId);

    // Найти последнюю попытку студента для конкретного теста
    @Query("SELECT tr FROM TestResult tr WHERE tr.student.id = :studentId AND tr.test.id = :testId ORDER BY tr.startedAt DESC")
    List<TestResult> findLatestAttemptByStudentAndTest(
            @Param("studentId") Long studentId,
            @Param("testId") Long testId,
            Pageable pageable);

    // Найти тесты с высоким процентом успешности (score/maxScore больше указанного процента)
    @Query("SELECT tr FROM TestResult tr WHERE (tr.score * 100 / tr.maxScore) >= :percentage AND tr.completed = true")
    List<TestResult> findBySuccessPercentageGreaterThanEqual(@Param("percentage") Integer percentage);

    // Найти все результаты по ID теста
    @Query("SELECT tr FROM TestResult tr WHERE tr.test.id = :testId")
    List<TestResult> findByTestId(@Param("testId") Long testId);

    @Query("SELECT tr FROM TestResult tr WHERE tr.student.id = :studentId")
    List<TestResult> findByStudentId(@Param("studentId") Long studentId);
}
