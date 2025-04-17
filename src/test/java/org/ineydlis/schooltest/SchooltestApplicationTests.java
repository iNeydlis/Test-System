package org.ineydlis.schooltest;

import org.ineydlis.schooltest.dto.TestCreateRequest;
import org.ineydlis.schooltest.dto.TestDto;
import org.ineydlis.schooltest.dto.TestResultDto;
import org.ineydlis.schooltest.dto.TestSubmissionRequest;
import org.ineydlis.schooltest.model.*;
import org.ineydlis.schooltest.repository.*;
import org.ineydlis.schooltest.service.TestService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class SchooltestApplicationTests {

    @Mock
    private TestRepository testRepository;


    @Mock
    private SubjectRepository subjectRepository;

    @Mock
    private GradeRepository gradeRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private TestResultRepository testResultRepository;

    @InjectMocks
    private TestService testService;

    private User testUser;
    private Subject testSubject;
    private Grade testGrade;
    private org.ineydlis.schooltest.model.Test testTest;

    @BeforeEach
    public void setup() {
        testUser = new User();
        testUser.setId(1L);
        testUser.setEmail("teacher@example.com");
        testUser.setRole(UserRole.TEACHER);

        testSubject = new Subject();
        testSubject.setId(1L);
        testSubject.setName("Математика");

        testUser.setSubjects(Set.of(testSubject));

        testGrade = new Grade();
        testGrade.setId(1L);
        testGrade.setNumber(5);
        testGrade.setLetter("А");
        testGrade.setFullName("5А");

        testUser.setTeachingGrades(Set.of(testGrade));

        testTest = new org.ineydlis.schooltest.model.Test();
        testTest.setId(1L);
        testTest.setTitle("Тест по математике");
        testTest.setDescription("Проверка знаний");
        testTest.setSubject(testSubject);
        testTest.setCreator(testUser);
        testTest.setCreatedAt(LocalDateTime.now());
        testTest.setTimeLimit(60);
        testTest.setActive(true);
        testTest.setMaxAttempts(1);
        Set<Grade> grades = new HashSet<>();
        grades.add(testGrade);
        testTest.setAvailableGrades(grades);
    }

    @Test
    public void testCreateTest() {
        // Подготовка
        TestCreateRequest request = new TestCreateRequest();
        request.setTitle("Тест по математике");
        request.setDescription("Проверка знаний");
        request.setSubjectId(1L);
        request.setTimeLimit(60);
        request.setMaxAttempts(1);
        request.setGradeIds(Collections.singletonList(1L));
        request.setQuestions(Collections.emptyList());

        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(subjectRepository.findById(1L)).thenReturn(Optional.of(testSubject));
        when(gradeRepository.findById(1L)).thenReturn(Optional.of(testGrade));
        when(testRepository.save(any(org.ineydlis.schooltest.model.Test.class))).thenReturn(testTest);

        // Действие
        TestDto result = testService.createTest(request, 1L);

        // Проверка
        assertNotNull(result);
        assertEquals("Тест по математике", result.getTitle());
        assertEquals("Проверка знаний", result.getDescription());
        assertEquals(1L, result.getSubjectId());
        verify(testRepository).save(any(org.ineydlis.schooltest.model.Test.class));
    }

    @Test
    public void testGetTestsByTeacher() {
        // Подготовка
        List<org.ineydlis.schooltest.model.Test> tests = Collections.singletonList(testTest);
        when(testRepository.findByCreator(testUser)).thenReturn(tests);
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));

        // Действие
        List<TestDto> result = testService.getTestsByTeacher(1L);

        // Проверка
        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("Тест по математике", result.get(0).getTitle());
        verify(testRepository).findByCreator(testUser);
    }

    @Test
    public void testGetTestsForStudent() {
        // Подготовка
        User student = new User();
        student.setId(2L);
        student.setRole(UserRole.STUDENT);

        Grade studentGrade = new Grade();
        studentGrade.setId(2L);
        studentGrade.setNumber(5);
        student.setGrade(studentGrade);

        List<org.ineydlis.schooltest.model.Test> tests = Collections.singletonList(testTest);

        when(userRepository.findById(2L)).thenReturn(Optional.of(student));
        when(testRepository.findByAvailableGradesAndActive(student.getGrade())).thenReturn(tests);
        when(testResultRepository.findByTestAndStudent(any(org.ineydlis.schooltest.model.Test.class), eq(student))).thenReturn(Collections.emptyList());

        // Действие
        List<TestDto> result = testService.getTestsForStudent(2L);

        // Проверка
        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("Тест по математике", result.get(0).getTitle());
        verify(userRepository).findById(2L);
        verify(testRepository).findByAvailableGradesAndActive(student.getGrade());
        verify(testResultRepository).findByTestAndStudent(testTest, student);
    }
    @Test
    public void testDeleteTest() {
        // Подготовка
        when(testRepository.findById(1L)).thenReturn(Optional.of(testTest));
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));

        // Действие
        testService.deleteTest(1L, 1L);

        // Проверка
        verify(testRepository).findById(1L);
        verify(testRepository).save(argThat(test -> !test.isActive()));
    }

    @Test
    public void testReactivateTest() {
        // Подготовка
        testTest.setActive(false);
        when(testRepository.findById(1L)).thenReturn(Optional.of(testTest));
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(testRepository.save(any(org.ineydlis.schooltest.model.Test.class))).thenReturn(testTest);

        // Действие
        TestDto result = testService.reactivateTest(1L, 1L, false);

        // Проверка
        assertNotNull(result);
        verify(testRepository).findById(1L);
        verify(testRepository).save(argThat(test -> test.isActive()));
    }
}