package com.logistics.common.security;

import dev.paseto.jpaseto.Claims;
import dev.paseto.jpaseto.Paseto;
import dev.paseto.jpaseto.Pasetos;
import dev.paseto.jpaseto.lang.Keys;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class PasetoTokenParser {

    private final SecretKey secretKey;

    public PasetoTokenParser(String secretKeyString) {
        byte[] keyBytes = secretKeyString.getBytes(StandardCharsets.UTF_8);
        this.secretKey = Keys.secretKey(keyBytes);
    }

    public ParsedPasetoToken parse(String compactToken) {
        Paseto paseto = Pasetos.parserBuilder()
            .setSharedSecret(secretKey)
            .build()
            .parse(compactToken);

        Claims claims = paseto.getClaims();
        String jti = claims.getTokenId();
        UUID userId = UUID.fromString(String.valueOf(claims.get("userId")));
        String email = String.valueOf(claims.get("email"));
        UUID roleId = UUID.fromString(String.valueOf(claims.get("roleId")));
        String roleName = String.valueOf(claims.get("roleName"));

        Object companyRaw = claims.get("companyId");
        UUID companyId = null;
        if (companyRaw != null && !String.valueOf(companyRaw).isBlank()) {
            companyId = UUID.fromString(String.valueOf(companyRaw));
        }

        Object whRaw = claims.get("warehouseId");
        UUID warehouseId = null;
        if (whRaw != null && !String.valueOf(whRaw).isBlank()) {
            warehouseId = UUID.fromString(String.valueOf(whRaw));
        }

        List<String> permissions = new ArrayList<>();
        Object rawPerms = claims.get("permissions");
        if (rawPerms instanceof List<?> list) {
            for (Object o : list) {
                permissions.add(String.valueOf(o));
            }
        }

        return new ParsedPasetoToken(jti, userId, email, roleId, roleName, companyId, warehouseId, permissions);
    }
}