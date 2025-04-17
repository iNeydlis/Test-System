package org.ineydlis.schooltest.dto;

import lombok.Data;

@Data
public class ProfileDto {
    private String email;
    private String currentPassword;
    private String newPassword;
    private String confirmPassword;
}