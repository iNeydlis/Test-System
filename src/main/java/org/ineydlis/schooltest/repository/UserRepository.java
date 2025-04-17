package org.ineydlis.schooltest.repository;

import org.ineydlis.schooltest.model.User;
import org.ineydlis.schooltest.model.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    Optional<User> findByToken(String token);
    boolean existsByUsername(String username);
    List<User> findByGradeId(Long gradeId);
    List<User> findByRole(UserRole role);
}
