package com.logistics.useridentityservice.domain.model;

import lombok.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

@Value
public class PasswordHash {
    private static final BCryptPasswordEncoder ENCODER = new BCryptPasswordEncoder(12);

    String hash;

    private PasswordHash(String hash) {
        this.hash = hash;
    }

    public static PasswordHash encode(String rawPassword) {
        return new PasswordHash(ENCODER.encode(rawPassword));
    }

    public static PasswordHash fromExisting(String hash) {
        return new PasswordHash(hash);
    }

    public boolean matches(String rawPassword) {
        return ENCODER.matches(rawPassword, this.hash);
    }

    @Override
    public String toString() {
        return "[REDACTED]";
    }
}
