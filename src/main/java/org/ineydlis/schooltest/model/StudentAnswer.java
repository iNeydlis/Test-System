package org.ineydlis.schooltest.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "student_answers")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class StudentAnswer {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "question_id", nullable = false)
    private Question question;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "test_result_id", nullable = false)
    private TestResult testResult;

    // For TEXT_ANSWER type
    @Column(columnDefinition = "TEXT")
    private String textAnswer;

    // For SINGLE_CHOICE and MULTIPLE_CHOICE types
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
            name = "student_answer_choices",
            joinColumns = @JoinColumn(name = "student_answer_id"),
            inverseJoinColumns = @JoinColumn(name = "answer_id")
    )
    private Set<Answer> selectedAnswers = new HashSet<>();

    private boolean isCorrect = false;

    private Integer earnedPoints = 0;
    @Column(name = "partial_ratio")
    private Double partialRatio;

}
