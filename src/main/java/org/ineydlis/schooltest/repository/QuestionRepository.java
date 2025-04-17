package org.ineydlis.schooltest.repository;

import org.ineydlis.schooltest.model.Question;
import org.ineydlis.schooltest.model.Test;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuestionRepository extends JpaRepository<Question, Long> {
    List<Question> findByTest(Test test);
}
