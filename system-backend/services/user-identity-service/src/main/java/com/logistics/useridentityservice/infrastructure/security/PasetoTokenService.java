package com.logistics.useridentityservice.infrastructure.security;

import dev.paseto.jpaseto.Paseto;
import dev.paseto.jpaseto.Pasetos;
import dev.paseto.jpaseto.lang.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

@Slf4j
@Service
public class PasetoTokenService {

    private final SecretKey secretKey;
    private final long accessTokenExpirySeconds;
    private final long refreshTokenExpirySeconds;
    private final StringRedisTemplate redisTemplate;

    public PasetoTokenService(
        @Value("${paseto.secret-key}") String secretKeyString,
        @Value("${paseto.access-token-expiry-seconds}") long accessTokenExpirySeconds,
        @Value("${paseto.refresh-token-expiry-seconds}") long refreshTokenExpirySeconds,
        StringRedisTemplate redisTemplate
    ) {
        byte[] keyBytes = secretKeyString.getBytes(StandardCharsets.UTF_8);
        this.secretKey = Keys.secretKey(keyBytes);
        this.accessTokenExpirySeconds = accessTokenExpirySeconds;
        this.refreshTokenExpirySeconds = refreshTokenExpirySeconds;
        this.redisTemplate = redisTemplate;
    }

    public String issueAccessToken(TokenClaims claims) {
        Instant now = Instant.now();
        Instant expiry = now.plusSeconds(accessTokenExpirySeconds);

        return Pasetos.V1.LOCAL.builder()
            .setSharedSecret(secretKey)
            .setTokenId(UUID.randomUUID().toString())
            .setIssuedAt(now)
            .setExpiration(expiry)
            .claim("userId",      claims.userId().toString())
            .claim("email",       claims.email())
            .claim("roleId",      claims.roleId().toString())
            .claim("roleName",    claims.roleName())
            .claim("permissions", claims.permissions())
            .claim("warehouseId", claims.warehouseId() != null ? claims.warehouseId().toString() : null)
            .claim("companyId", claims.companyId() != null ? claims.companyId().toString() : null)
            .compact();
    }

    public String issueRefreshToken(String userId) {
        Instant now = Instant.now();
        Instant expiry = now.plusSeconds(refreshTokenExpirySeconds);

        return Pasetos.V1.LOCAL.builder()
            .setSharedSecret(secretKey)
            .setTokenId(UUID.randomUUID().toString())
            .setIssuedAt(now)
            .setExpiration(expiry)
            .claim("userId",    userId)
            .claim("tokenType", "REFRESH")
            .compact();
    }

    public Paseto verify(String token) {
        return Pasetos.parserBuilder()
            .setSharedSecret(secretKey)
            .build()
            .parse(token);
    }

    public void revokeToken(String tokenId) {
        String key = "identity:revoked:" + tokenId;
        redisTemplate.opsForValue().set(key, "1", Duration.ofSeconds(refreshTokenExpirySeconds));
        log.info("Token revoked: jti={}", tokenId);
    }

    public boolean isRevoked(String tokenId) {
        String key = "identity:revoked:" + tokenId;
        return Boolean.TRUE.equals(redisTemplate.hasKey(key));
    }
}
