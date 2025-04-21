
package org.ineydlis.schooltest.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "tests")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Test {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    private String description;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "subject_id", nullable = false)
    private Subject subject;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "creator_id", nullable = false)
    private User creator;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @Column(nullable = false)
    private Integer timeLimit; // in minutes

    @Column(nullable = false)
    private boolean isActive = true;

    @Column(nullable = false)
    private Integer maxAttempts = 1; // Default to 1 attempt

    @Column
    private Integer questionsToShow;

    // Grades that can access this test
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "test_grades",
            joinColumns = @JoinColumn(name = "test_id"),
            inverseJoinColumns = @JoinColumn(name = "grade_id")
    )
    private Set<Grade> availableGrades = new HashSet<>();

    @OneToMany(mappedBy = "test", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Question> questions = new ArrayList<>();

    @Column(name = "reference_materials_filename")
    private String referenceMaterialsFilename;

    @Column(name = "reference_materials_path")
    private String referenceMaterialsPath;
}

