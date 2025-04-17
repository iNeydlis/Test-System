package org.ineydlis.schooltest.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "school_grades")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Grade {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Integer number; // 1-11

    @Column(nullable = false)
    private String letter; // А-Д

    // Строковое представление класса (например, "1А")
    @Column(nullable = false, unique = true)
    private String fullName;
}